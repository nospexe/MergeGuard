import Topnav from "@/components/layout/Topnav";
import Sidebar from "@/components/layout/Sidebar";

export default function HistoryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Topnav />
      <Sidebar />
      <main className="ml-0 md:ml-60 min-h-[calc(100vh-56px)]">
        <div className="p-4 md:p-6">{children}</div>
      </main>
    </>
  );
}
