"""
coverage_overlay.py — Coverage Overlay Engine for MergeGuard
=============================================================

PURPOSE
-------
After the BlastRadius engine tells us *which files* are in the blast
radius, this module answers: "Of those files, which ones have no test
coverage?"

Uncovered files in the blast radius are the most dangerous: if something
breaks there, your test suite won't catch it before it reaches production.

HOW coverage.py WORKS
---------------------
When you run `pytest --cov=.`, coverage.py instruments your code by
monkey-patching Python's bytecode execution. It records which line
numbers were actually executed during the test run, then writes that
data to a binary file called `.coverage` in your project root.

We read this file using the `coverage` Python library's API. It gives us
a per-file report of:
  - Which lines were executed (covered)
  - Which lines were not executed (uncovered/missing)
  - The total line count

We then cross-reference these line numbers with the AST symbol
definitions from the BlastRadius engine to produce per-symbol coverage
annotations.

DEPENDENCY
----------
Requires the `coverage` package (Apache 2.0 license):
  pip install coverage

This is the same package that generates the .coverage file — we're
using its programmatic API, not the CLI.
"""

from __future__ import annotations

import json
import logging
from dataclasses import dataclass, field, asdict
from pathlib import Path
from typing import Optional

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Data Classes
# ---------------------------------------------------------------------------

@dataclass
class LineCoverageData:
    """
    Raw line-level coverage data for a single file.

    This is the direct output of reading the .coverage file — it hasn't
    been mapped to symbols yet, just to line numbers.
    """
    file_path: str
    covered_lines: list[int]    # Lines executed during the test run
    missing_lines: list[int]    # Lines not executed
    total_lines: int
    coverage_percent: float     # 0.0 – 100.0


@dataclass
class SymbolCoverageAnnotation:
    """
    Coverage status of a single symbol (function, class, method).

    We derive this by checking whether the symbol's definition lines
    overlap with the covered/missing line sets.

    COVERAGE STATUS DEFINITIONS
    ---------------------------
    "covered"   → Every line in the symbol's body was executed at least once.
    "partial"   → Some lines were executed but not all.
    "uncovered" → No lines in the symbol's body were executed.
    "unknown"   → We have no coverage data for this file at all.
    """
    qualified_name: str          # e.g. "auth.utils.validate_token"
    file_path: str
    line_start: int
    line_end: int
    coverage_status: str         # "covered", "partial", "uncovered", "unknown"
    covered_lines_in_symbol: int
    total_lines_in_symbol: int
    coverage_percent: float


@dataclass
class CoverageOverlayResult:
    """
    The complete output of the coverage overlay engine.

    This gets merged with the BlastRadiusResult — the API layer
    uses uncovered_module_paths to populate BlastRadiusResult.uncovered_nodes,
    which then feeds into the risk scorer.
    """
    coverage_data_path: str
    annotations: list[SymbolCoverageAnnotation] = field(default_factory=list)
    uncovered_module_paths: list[str] = field(default_factory=list)
    files_with_no_coverage_data: list[str] = field(default_factory=list)
    overall_coverage_percent: float = 0.0


# ---------------------------------------------------------------------------
# Coverage File Reader
# ---------------------------------------------------------------------------

class CoverageFileReader:
    """
    Reads a .coverage file and returns per-file line coverage data.

    HOW THE coverage LIBRARY API WORKS
    ------------------------------------
    The `coverage.Coverage` object is the main entry point.
    After loading a .coverage file, you call `coverage_obj.get_data()`
    to get a `CoverageData` object. From there:

      - `data.measured_files()` → list of all files that were measured
      - `data.lines(filename)`  → list of executed line numbers for a file
      - `data.arcs(filename)`   → branch coverage data (we don't use this)

    To get missing lines, we need to know which lines *exist* in the file.
    We do this by parsing the file with `ast` to find all statement lines,
    then subtracting the covered lines.
    """

    def read(self, coverage_path: str | Path) -> dict[str, LineCoverageData]:
        """
        Load a .coverage file and return a map of filepath → LineCoverageData.

        Parameters
        ----------
        coverage_path : Path to the .coverage file (typically project root).

        Returns
        -------
        dict[str, LineCoverageData] keyed by absolute file path.
        """
        try:
            import coverage as coverage_lib
        except ImportError:
            raise ImportError(
                "The 'coverage' package is required for CoverageOverlay. "
                "Install it with: pip install coverage"
            )

        coverage_path = Path(coverage_path).resolve()
        if not coverage_path.exists():
            raise FileNotFoundError(
                f"Coverage file not found: {coverage_path}\n"
                "Run 'pytest --cov=.' first to generate it."
            )

        cov = coverage_lib.Coverage(data_file=str(coverage_path))
        cov.load()
        data = cov.get_data()

        result: dict[str, LineCoverageData] = {}

        for filepath in data.measured_files():
            covered_lines = sorted(data.lines(filepath) or [])
            all_executable = self._get_executable_lines(filepath)
            missing_lines = sorted(set(all_executable) - set(covered_lines))
            total = len(all_executable)
            pct = (len(covered_lines) / total * 100.0) if total > 0 else 0.0

            result[filepath] = LineCoverageData(
                file_path=filepath,
                covered_lines=covered_lines,
                missing_lines=missing_lines,
                total_lines=total,
                coverage_percent=round(pct, 2),
            )

        logger.info(
            "Loaded coverage data for %d files from %s",
            len(result),
            coverage_path,
        )
        return result

    @staticmethod
    def _get_executable_lines(filepath: str) -> list[int]:
        """
        Return the line numbers of all executable statements in a file.

        NOT all lines in a Python file are executable — blank lines,
        comments, and decorator lines don't count. We use the AST to
        find only the lines that correspond to actual statements.

        This is the same approach coverage.py itself uses internally.
        """
        import ast

        try:
            source = Path(filepath).read_text(encoding="utf-8")
            tree = ast.parse(source)
        except (OSError, SyntaxError):
            return []

        lines: set[int] = set()
        for node in ast.walk(tree):
            if hasattr(node, "lineno"):
                lines.add(node.lineno)
        return sorted(lines)


# ---------------------------------------------------------------------------
# Symbol Coverage Annotator
# ---------------------------------------------------------------------------

class SymbolCoverageAnnotator:
    """
    Maps line-level coverage data onto symbol-level annotations.

    HOW THE MAPPING WORKS
    ---------------------
    Each SymbolDefinition from the BlastRadius engine has a line_start
    and line_end. We look up those lines in the LineCoverageData and
    compute what fraction of the symbol's lines were covered.

    WHY LINE-LEVEL, NOT FUNCTION-LEVEL?
    ------------------------------------
    coverage.py fundamentally tracks lines, not functions. A function
    might have 20 lines but only 3 of them were ever executed (perhaps
    the happy path only, never the error-handling branches). Line-level
    granularity captures this nuance.
    """

    def annotate(
        self,
        symbol_tables: dict,  # module_path → FileSymbolTable (from blast_radius)
        coverage_data: dict[str, LineCoverageData],
        repo_root: str | Path,
    ) -> CoverageOverlayResult:
        """
        Cross-reference symbol definitions with coverage line data.

        Parameters
        ----------
        symbol_tables : Output of RepositoryScanner.scan() from blast_radius.
        coverage_data : Output of CoverageFileReader.read().
        repo_root     : Repository root for resolving relative paths.

        Returns
        -------
        CoverageOverlayResult with per-symbol annotations.
        """
        repo_root = Path(repo_root).resolve()

        # Build a lookup: absolute file path → LineCoverageData
        # Coverage paths may use different representations, so we normalise.
        coverage_by_abs_path: dict[str, LineCoverageData] = {
            str(Path(p).resolve()): v for p, v in coverage_data.items()
        }

        result = CoverageOverlayResult(
            coverage_data_path=str(next(iter(coverage_data.keys()), ""))
        )

        total_covered = 0
        total_executable = 0

        for module_path, table in symbol_tables.items():
            abs_path = str(Path(table.file_path).resolve())
            file_coverage = coverage_by_abs_path.get(abs_path)

            if file_coverage is None:
                result.files_with_no_coverage_data.append(module_path)

            for defn in table.definitions:
                annotation = self._annotate_symbol(defn, file_coverage)
                result.annotations.append(annotation)

            if file_coverage:
                total_covered += len(file_coverage.covered_lines)
                total_executable += file_coverage.total_lines

        # Build the list of module paths with zero coverage — this feeds
        # directly into BlastRadiusResult.uncovered_nodes
        uncovered_modules: set[str] = set()
        for ann in result.annotations:
            if ann.coverage_status == "uncovered":
                # Derive module path from file path
                try:
                    rel = Path(ann.file_path).relative_to(repo_root)
                    parts = list(rel.parts)
                    if parts[-1] == "__init__.py":
                        parts = parts[:-1]
                    else:
                        parts[-1] = parts[-1][:-3]
                    uncovered_modules.add(".".join(parts))
                except ValueError:
                    uncovered_modules.add(ann.qualified_name)

        result.uncovered_module_paths = sorted(uncovered_modules)
        result.overall_coverage_percent = (
            round(total_covered / total_executable * 100.0, 2)
            if total_executable > 0 else 0.0
        )

        return result

    @staticmethod
    def _annotate_symbol(
        defn,  # SymbolDefinition from blast_radius
        file_coverage: Optional[LineCoverageData],
    ) -> SymbolCoverageAnnotation:
        """
        Compute the coverage status of a single symbol.

        We look at the lines from line_start to line_end (inclusive) and
        check how many of them appear in the covered_lines set.
        """
        if file_coverage is None:
            return SymbolCoverageAnnotation(
                qualified_name=defn.qualified_name,
                file_path=defn.file_path,
                line_start=defn.line_start,
                line_end=defn.line_end,
                coverage_status="unknown",
                covered_lines_in_symbol=0,
                total_lines_in_symbol=0,
                coverage_percent=0.0,
            )

        symbol_lines = set(range(defn.line_start, defn.line_end + 1))
        covered_set = set(file_coverage.covered_lines)
        missing_set = set(file_coverage.missing_lines)

        covered_in_symbol = len(symbol_lines & covered_set)
        missing_in_symbol = len(symbol_lines & missing_set)
        total_in_symbol = covered_in_symbol + missing_in_symbol

        if total_in_symbol == 0:
            status = "unknown"
            pct = 0.0
        elif covered_in_symbol == 0:
            status = "uncovered"
            pct = 0.0
        elif missing_in_symbol == 0:
            status = "covered"
            pct = 100.0
        else:
            status = "partial"
            pct = round(covered_in_symbol / total_in_symbol * 100.0, 2)

        return SymbolCoverageAnnotation(
            qualified_name=defn.qualified_name,
            file_path=defn.file_path,
            line_start=defn.line_start,
            line_end=defn.line_end,
            coverage_status=status,
            covered_lines_in_symbol=covered_in_symbol,
            total_lines_in_symbol=total_in_symbol,
            coverage_percent=pct,
        )


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def build_coverage_overlay(
    coverage_path: str | Path,
    symbol_tables: dict,
    repo_root: str | Path,
) -> CoverageOverlayResult:
    """
    Run the full coverage overlay pipeline.

    This is what the FastAPI backend calls. It reads the .coverage file,
    annotates all symbols, and returns the result — including the list of
    uncovered module paths that the BlastRadius engine uses for risk scoring.

    Parameters
    ----------
    coverage_path : Path to the .coverage file.
    symbol_tables : Output of RepositoryScanner.scan() from blast_radius.
    repo_root     : Root of the repository.

    Returns
    -------
    CoverageOverlayResult — serialisable via dataclasses.asdict().

    Example
    -------
    >>> from blast_radius import RepositoryScanner
    >>> tables = RepositoryScanner("/path/to/repo").scan()
    >>> result = build_coverage_overlay(
    ...     coverage_path="/path/to/repo/.coverage",
    ...     symbol_tables=tables,
    ...     repo_root="/path/to/repo",
    ... )
    >>> print(result.overall_coverage_percent)
    67.3
    """
    reader = CoverageFileReader()
    coverage_data = reader.read(coverage_path)

    annotator = SymbolCoverageAnnotator()
    return annotator.annotate(symbol_tables, coverage_data, repo_root)


def overlay_to_json(result: CoverageOverlayResult) -> str:
    """Serialise a CoverageOverlayResult to a pretty-printed JSON string."""
    return json.dumps(asdict(result), indent=2)