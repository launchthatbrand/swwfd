"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  BriefcaseBusiness,
  Handshake,
  Plug,
  UserRound,
  Users,
  Workflow,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@acme/ui/sidebar";
import { cn } from "@acme/ui";

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const buildItems = (section: "admin" | "dashboard"): NavItem[] => {
  if (section === "admin") {
    return [
      { label: "Users", href: "/admin/users", icon: Users },
      { label: "Contractors", href: "/admin/contractors", icon: UserRound },
      { label: "Job Seekers", href: "/admin/job-seekers", icon: Users },
      { label: "Partners", href: "/admin/partners", icon: Handshake },
      { label: "Job Listings", href: "/admin/job-listings", icon: BriefcaseBusiness },
      { label: "Integrations", href: "/admin/integrations", icon: Plug },
      { label: "Analytics", href: "/admin/analytics", icon: BarChart3 },
      { label: "Automations", href: "/admin/automations", icon: Workflow },
    ];
  }

  return [{ label: "Dashboard", href: "/dashboard", icon: BriefcaseBusiness }];
};

export function AppSidebar(props: { section: "admin" | "dashboard" }) {
  const pathname = usePathname();
  const items = buildItems(props.section);

  return (
    <Sidebar
      variant="inset"
      collapsible="icon"
      className="overflow-hidden border-border/40 text-sidebar-foreground"
    >
      <SidebarHeader className="p-1">
        <div className="text-muted-foreground px-4 py-2 text-xs font-semibold uppercase tracking-wide group-data-[collapsible=icon]:hidden">
          {props.section === "admin" ? "Admin" : "Dashboard"}
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu className="gap-2 p-3 group-data-[collapsible=icon]:items-center">
          {items.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            const Icon = item.icon;
            return (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton
                  asChild
                  tooltip={item.label}
                  isActive={active}
                  size="default"
                  className={cn(
                    "h-11 rounded-xl text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground group-data-[collapsible=icon]:size-11! [&>svg]:size-6!",
                    active ? "data-[active=true]:bg-sidebar-accent/60" : "",
                  )}
                >
                  <Link
                    href={item.href}
                    className="gap-3 font-medium tracking-tight group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:gap-0"
                  >
                    <Icon className="text-sidebar-foreground/70 transition-colors group-hover/menu-button:text-sidebar-foreground" />
                    <span className="group-data-[collapsible=icon]:hidden">{item.label}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
        <SidebarSeparator className="bg-sidebar-border w-[90%]!" />
      </SidebarContent>
    </Sidebar>
  );
}

