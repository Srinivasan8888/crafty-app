import Link from "next/link";
import { Logo } from "./Logo";

export function AppFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="app-footer">
      <Logo size="lg" cream />
      <div className="socials">
        <a
          aria-label="Instagram"
          href="https://instagram.com/crafty.in"
          target="_blank"
          rel="noopener noreferrer"
        >
          <span>IG</span>
        </a>
        <a
          aria-label="Facebook"
          href="https://facebook.com/crafty.in"
          target="_blank"
          rel="noopener noreferrer"
        >
          <span>FB</span>
        </a>
        <a
          aria-label="X"
          href="https://x.com/crafty_in"
          target="_blank"
          rel="noopener noreferrer"
        >
          <span>X</span>
        </a>
      </div>
      <div className="links">
        <Link href="/contact">About</Link>
        <Link href="/contact">Contact</Link>
        <Link href="/privacy">Privacy</Link>
        <Link href="/terms">Terms</Link>
        <Link href="/list-your-profile">List your profile</Link>
        <Link href="/bengaluru/crafters">Crafters</Link>
      </div>
      <div className="copy">
        © {year} Dealquick Labs Pvt Ltd · Made in Bengaluru
      </div>
    </footer>
  );
}
