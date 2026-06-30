import React from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-black text-neutral-300 font-sans selection:bg-white selection:text-black pt-24 pb-32">
      <div className="max-w-3xl mx-auto px-6 sm:px-12">
        <Link href="/" className="inline-flex items-center text-sm font-medium text-neutral-500 hover:text-white transition-colors mb-12">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Home
        </Link>
        
        <h1 className="text-4xl md:text-5xl font-bold tracking-tighter text-white mb-8">Privacy Policy</h1>
        <p className="text-sm text-neutral-500 mb-12">Last Updated: June 30, 2026</p>

        <div className="space-y-10 text-base leading-relaxed">
          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">1. Information We Collect</h2>
            <p className="mb-4">
              At Indecode, we collect information that you provide directly to us when you create an account, request a feature, or interact with our platform. This includes:
            </p>
            <ul className="list-disc pl-5 space-y-2 text-neutral-400">
              <li><strong>Account Information:</strong> Name, email address, and GitHub profile details.</li>
              <li><strong>Repository Data:</strong> We require access to your GitHub repositories to analyze codebase context and generate pull requests.</li>
              <li><strong>Usage Data:</strong> We collect data on how you interact with our services, such as feature requests submitted and actions taken in the dashboard.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">2. How We Use Your Information</h2>
            <p className="mb-4">
              The information we collect is strictly used to provide, maintain, and improve our services. Specifically, we use your data to:
            </p>
            <ul className="list-disc pl-5 space-y-2 text-neutral-400">
              <li>Analyze your codebase using AI to generate accurate implementation plans and code.</li>
              <li>Automatically open and manage Pull Requests on your behalf.</li>
              <li>Communicate with you regarding updates, security alerts, and support messages.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">3. Data Security & AI Processing</h2>
            <p className="mb-4">
              Your codebase is analyzed dynamically. We utilize vector embeddings to understand context, but we do not use your proprietary code to train public foundational AI models. We implement industry-standard security measures to protect your data against unauthorized access, alteration, or destruction.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">4. Third-Party Services</h2>
            <p className="mb-4">
              We may share necessary data with trusted third-party services (such as OpenAI/Anthropic for language processing and Stripe for payment processing) strictly for the purpose of operating our service. These providers are bound by strict confidentiality and data protection agreements.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">5. Your Rights</h2>
            <p className="mb-4">
              You have the right to access, update, or delete your personal information. You can revoke our access to your GitHub repositories at any time through your GitHub settings. If you wish to delete your Indecode account and associated data completely, please contact us.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">6. Contact Us</h2>
            <p>
              If you have any questions about this Privacy Policy, please contact us at <a href="mailto:sumitomvishwkarma@gmail.com" className="text-white underline underline-offset-4 hover:text-neutral-300">sumitomvishwkarma@gmail.com</a>.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
