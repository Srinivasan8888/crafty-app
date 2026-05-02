import { ClerkProvider, SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <ClerkProvider>
      <div className="flex min-h-screen items-center justify-center bg-canvas p-6">
        <SignUp />
      </div>
    </ClerkProvider>
  );
}
