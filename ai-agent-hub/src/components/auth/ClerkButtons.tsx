import { SignedIn, SignedOut, UserButton } from '@clerk/clerk-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/Button';

/** Real Clerk auth controls — code-split so they load only when auth is enabled. */
export default function ClerkButtons() {
  return (
    <>
      <SignedOut>
        <Link to="/sign-in">
          <Button variant="ghost" size="sm">
            Sign in
          </Button>
        </Link>
        <Link to="/sign-up">
          <Button size="sm">Sign up</Button>
        </Link>
      </SignedOut>
      <SignedIn>
        <UserButton appearance={{ elements: { avatarBox: 'h-8 w-8 ring-2 ring-accent/40' } }} />
      </SignedIn>
    </>
  );
}
