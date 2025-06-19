"use client";

import type React from "react";

import { DashboardNav } from "@/components/dashboard-nav";
import { ModeToggle } from "@/components/mode-toggle";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarProvider,
  SidebarTrigger,
  SidebarInset,
} from "@/components/ui/sidebar";
import { useAuth } from "@/context/auth-context";
import { LogOut, Menu, Shield, User } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { NotificationsPopover } from "@/components/notifications-popover";

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { user, isAuthenticated, logout, loading } = useAuth();
  const pathname = usePathname();

  // Show loading while checking authentication
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    if (typeof window !== "undefined") {
      window.location.href = "/auth/login";
    }
    return null;
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen bg-muted/10">
        {/* Desktop Sidebar */}
        <Sidebar
          className="hidden md:flex glass-effect modern-shadow"
          variant="floating"
          collapsible="icon"
        >
          <SidebarHeader className="flex flex-col h-auto items-stretch border-b px-2 sm:px-4 pt-2 pb-0">
            <div className="relative flex items-center justify-between w-full mb-2">
              <SidebarTrigger className="transition-all duration-200 absolute right-0 top-0 group-data-[state=collapsed]:static group-data-[state=collapsed]:mx-auto group-data-[state=collapsed]:block hover-scale" />
            </div>
            <Link
              href="/dashboard"
              className="flex items-center gap-2 font-semibold justify-center"
            >
              <Shield className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
              <span className="sidebar-title-text transition-all duration-200 group-data-[state=collapsed]:hidden text-primary text-sm sm:text-base">
                Guardian Eye
              </span>
            </Link>
          </SidebarHeader>
          <SidebarContent>
            <DashboardNav pathname={pathname} />
          </SidebarContent>
          <SidebarFooter className="border-t p-2 sm:p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Avatar className="h-7 w-7 sm:h-8 sm:w-8 hover-scale">
                  <AvatarImage
                    src={`https://avatar.vercel.sh/${user?.email || "user"}`}
                    alt={user?.name || "User"}
                  />
                  <AvatarFallback>
                    {user?.name?.charAt(0) || "U"}
                  </AvatarFallback>
                </Avatar>
                <span className="text-xs sm:text-sm font-medium sidebar-text group-data-[state=collapsed]:hidden">
                  {user?.name || "User"}
                </span>
              </div>
              <div className="flex items-center gap-1 sm:gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  asChild
                  className="button-hover h-7 w-7 sm:h-9 sm:w-9"
                >
                  <Link href="/dashboard/profile">
                    <User className="h-4 w-4 sm:h-5 sm:w-5" />
                    <span className="sr-only">Profile</span>
                  </Link>
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={logout}
                  className="button-hover h-7 w-7 sm:h-9 sm:w-9"
                >
                  <LogOut className="h-4 w-4 sm:h-5 sm:w-5" />
                  <span className="sr-only">Logout</span>
                </Button>
              </div>
            </div>
          </SidebarFooter>
        </Sidebar>

        {/* Removed Mobile Sidebar (Sheet) */}

        {/* Main Content */}
        <SidebarInset>
          <header className="sticky top-0 z-10 flex h-14 sm:h-16 items-center justify-between border-b glass-effect px-2 sm:px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="flex-1 md:ml-4"></div>
            <div className="flex items-center gap-1 sm:gap-2">
              <NotificationsPopover />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="rounded-full button-hover h-7 w-7 sm:h-9 sm:w-9"
                  >
                    <Avatar className="h-7 w-7 sm:h-8 sm:w-8 hover-scale">
                      <AvatarImage
                        src={`https://avatar.vercel.sh/${
                          user?.email || "user"
                        }`}
                        alt={user?.name || "User"}
                      />
                      <AvatarFallback>
                        {user?.name?.charAt(0) || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <span className="sr-only">User menu</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="w-48 sm:w-56 glass-effect modern-shadow"
                >
                  <DropdownMenuLabel>
                    <div className="flex flex-col space-y-1">
                      <p className="text-xs sm:text-sm font-medium">
                        {user?.name || "User"}
                      </p>
                      <p className="text-[10px] sm:text-xs text-muted-foreground">
                        {user?.email || ""}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild className="hover-scale">
                    <Link href="/dashboard/profile">
                      <User className="mr-2 h-4 w-4" />
                      <span className="text-xs sm:text-sm">Profile</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={logout} className="hover-scale">
                    <LogOut className="mr-2 h-4 w-4" />
                    <span className="text-xs sm:text-sm">Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <ModeToggle />
            </div>
          </header>
          <main className="flex-1 w-full p-2 sm:p-4 md:p-6 lg:p-8 animate-fade-in">
            {children}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
