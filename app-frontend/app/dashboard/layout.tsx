import Topnav from "@/components/layout/Topnav";
import Sidebar from "@/components/layout/Sidebar";

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <>
            <Topnav />
            <Sidebar />
            <main className="ml-60 min-h-[calc(100vh-56px)]">
                <div className="p-6">{children}</div>
            </main>
        </>
    );
}
