import { Link } from 'react-router-dom';
import { ExternalLink } from '@/components/ui/external-link';
import { LegalPolicySection } from '@/components/legal/LegalPolicySection';

export function PrivacyIntroductionSection() {
  return (
    <LegalPolicySection title="1. Introduction">
      <p>
        ZNTEQR™ (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;), developed and operated by{' '}
        <ExternalLink href="https://eqrweb.zinitek.com" className="hover:text-foreground">
          ZNT LLC
        </ExternalLink>
        , is committed to protecting the privacy of every person and organization that uses our fleet
        equipment management platform. This Privacy Policy explains in plain language what information
        we collect, why we collect it, which external service providers process it, how we protect it,
        and what rights you have.
      </p>
      <p>
        This policy applies to all users of the ZNTEQR web application located at{' '}
        <ExternalLink href="https://eqr.zinitek.com" className="hover:text-foreground">
          eqr.zinitek.com
        </ExternalLink>
        , including the QR-code scanning experience, all API endpoints, and any associated mobile or
        progressive web app functionality.
      </p>
      <p>
        Your use of the Service is also governed by our{' '}
        <Link to="/terms-of-service" className="underline">
          Terms of Service
        </Link>
        . Capitalized terms not defined in this policy have the meanings given in the Terms.
      </p>
    </LegalPolicySection>
  );
}
