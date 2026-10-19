import { PageContainer } from "@/components/layout/PageContainer";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";

export default function ResetPasswordPage() {
  return (
    <main>
      <PageContainer className="py-10 md:py-16">
        <ResetPasswordForm />
      </PageContainer>
    </main>
  );
}
