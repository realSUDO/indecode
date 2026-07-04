import Link from "next/link";
import { User, Settings, CreditCard } from "lucide-react";

const sidebarNavItems = [
  {
    title: "General",
    href: "/settings",
    icon: <Settings className="w-4 h-4 mr-2" />,
  },
  {
    title: "Profile",
    href: "/settings/profile",
    icon: <User className="w-4 h-4 mr-2" />,
  },
  {
    title: "Billing",
    href: "/billing",
    icon: <CreditCard className="w-4 h-4 mr-2" />,
  }
];

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col md:flex-row gap-8 max-w-6xl mx-auto py-8">
      <aside className="w-full md:w-64 flex-shrink-0">
        <h2 className="text-xl font-bold tracking-tight text-white mb-6 px-2">Settings</h2>
        <nav className="flex flex-col gap-1">
          {sidebarNavItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center px-4 py-2 text-sm font-medium rounded-lg text-neutral-400 hover:text-white hover:bg-white/5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20"
            >
              {item.icon}
              {item.title}
            </Link>
          ))}
        </nav>
      </aside>
      <div className="flex-1">
        {children}
      </div>
    </div>
  );
}
