"use client";

import { AnimatedThemeToggler, MobileNav, MobileNavHeader, MobileNavMenu, MobileNavToggle, NavBody, NavItems, Navbar, NavbarButton, Separator } from "@launchthatapp/ui";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { AuthNavUser } from "~/components/auth/AuthNavUser";

interface NavItem {
  name: string;
  link: string;
  submenu?: { name: string; link: string; description?: string }[];
}

const navItems: NavItem[] = [
  { name: "Home", link: "/" },
  { name: "Jobs", link: "/jobs" },
  { name: "About", link: "/about" },
];

export default function HeaderDefault() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="absolute top-0 left-0 w-full">
      <Navbar className="top-0">
        {/* Desktop Navigation */}
        <NavBody className="px-2.5">

          <Link href="/" className="flex items-center gap-2">
            <div className="relative">
              <Image
                src="/logo-icon-dark-nobg-scaled-removebg.png"
                alt="SWWFD"
                width={100}
                height={100}
                className="block dark:hidden h-8 w-8"
              />
              <Image
                src="/logo-icon-light-nobg-scaled-removebg.png"
                alt="SWWFD"
                width={100}
                height={100}
                className="hidden dark:block h-8 w-8"
              />
            </div>
            <div className="text-foreground text-lg font-medium tracking-wide flex gap-[0.1em]">
              <span className="font-extrabold">SWWFD</span>
            </div>
          </Link>

          <NavItems items={navItems} />
          <div className="flex relative items-center gap-4">
            <div className="flex flex-1 items-stretch h-full min-h-10">
              <AnimatedThemeToggler className="h-full min-h-10 bg-background" />
            </div>
            <Separator orientation="vertical" className="mx-2 data-[orientation=vertical]:h-4 min-h-10 bg-border flex h-full items-center" />
            <AuthNavUser className="rounded-full" />
            {/* <NavbarButton variant="secondary">Login</NavbarButton>
            <NavbarButton variant="primary">Book a call</NavbarButton> */}
          </div>

        </NavBody>

        {/* Mobile Navigation */}
        <MobileNav>
          <MobileNavHeader className="px-4 py-2">
            <Link href="/" className="flex items-center gap-2">
              <div className="relative">
                <Image
                  src="/logo-icon-dark-nobg-scaled-removebg.png"
                  alt="SWWFD"
                  width={100}
                  height={100}
                  className="block dark:hidden h-8 w-8"
                />
                <Image
                  src="/logo-icon-light-nobg-scaled-removebg.png"
                  alt="SWWFD"
                  width={100}
                  height={100}
                  className="hidden dark:block h-8 w-8"
                />
              </div>
              <div className="text-foreground text-lg font-medium tracking-wide flex gap-[0.1em]">
                <span className="font-extrabold">SWWFD</span>
              </div>
            </Link>
            <MobileNavToggle
              isOpen={isMobileMenuOpen}
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            />
          </MobileNavHeader>

          <MobileNavMenu
            isOpen={isMobileMenuOpen}
            onClose={() => setIsMobileMenuOpen(false)}
          >
            {navItems.map((item, idx) => (
              <div key={`mobile-link-${idx}`}>
                <a
                  href={item.link}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="relative text-neutral-600 dark:text-neutral-300"
                >
                  <span className="block">{item.name}</span>
                </a>
                {item.submenu ? (
                  <div className="ml-4 mt-1 flex flex-col gap-1">
                    {item.submenu.map((sub, subIdx) => (
                      <a
                        key={`mobile-sub-${subIdx}`}
                        href={sub.link}
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="block py-1 text-sm text-neutral-500 transition-colors hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200"
                      >
                        {sub.name}
                      </a>
                    ))}
                  </div>
                ) : null}
              </div>
            ))}
            <div className="flex w-full flex-col gap-4">
              <NavbarButton
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  window.location.assign("/sign-in");
                }}
                variant="primary"
                className="w-full"
              >
                Login
              </NavbarButton>
            </div>
          </MobileNavMenu>
        </MobileNav>
      </Navbar>
    </div>
  );
}
