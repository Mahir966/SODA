import React, { useState } from 'react';

interface ContactModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ContactModal: React.FC<ContactModalProps> = ({ isOpen, onClose }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [topic, setTopic] = useState('Customer Support');
  const [message, setMessage] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submittedPayload, setSubmittedPayload] = useState<{
    name: string;
    email: string;
    topic: string;
    message: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const validate = () => {
    const nextErrors: Record<string, string> = {};
    if (name.trim().length < 2) {
      nextErrors.name = 'Please enter your name (at least 2 characters).';
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      nextErrors.email = 'Please enter a valid email address.';
    }
    if (message.trim().length < 10) {
      nextErrors.message = 'Please enter a message of at least 10 characters.';
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const payload = {
      name: name.trim(),
      email: email.trim(),
      topic,
      message: message.trim(),
    };

    try {
      const saved = JSON.parse(localStorage.getItem('soda_contact_inquiries') || '[]');
      saved.unshift({ ...payload, createdAt: new Date().toISOString() });
      localStorage.setItem('soda_contact_inquiries', JSON.stringify(saved.slice(0, 20)));
    } catch {
      // Ignore storage errors
    }

    setSubmittedPayload(payload);
  };

  const handleCopy = async () => {
    if (!submittedPayload) return;
    const text = `From: ${submittedPayload.name} <${submittedPayload.email}>\nTopic: ${submittedPayload.topic}\n\n${submittedPayload.message}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[500] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="contact-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-lg rounded-3xl border border-white/15 bg-[#041d19]/95 p-6 text-white shadow-2xl backdrop-blur-2xl sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <span className="text-xs font-bold tracking-widest uppercase text-[#fbcfe8]">
              Get in Touch
            </span>
            <h2 id="contact-modal-title" className="font-['Galada'] text-4xl font-normal">
              Contact Us
            </h2>
            <p className="mt-1 text-xs text-white/70">
              Questions about Diet Classic, Zero Lime, or wholesale distribution?
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close contact dialog"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/5 text-lg text-white transition hover:border-[#fbcfe8] hover:bg-[#fbcfe8] hover:text-[#011d17]"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate className="mt-5 space-y-4">
          <div>
            <label htmlFor="modal-contact-name" className="mb-1 block text-xs font-semibold text-white/80">
              Your Name *
            </label>
            <input
              id="modal-contact-name"
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (errors.name) setErrors({ ...errors, name: '' });
              }}
              placeholder="Elena Rostova"
              className="w-full rounded-xl border border-white/15 bg-black/30 px-3.5 py-2.5 text-sm text-white placeholder-white/40"
            />
            {errors.name && <p className="mt-1 text-xs text-rose-300">{errors.name}</p>}
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="modal-contact-email" className="mb-1 block text-xs font-semibold text-white/80">
                Email Address *
              </label>
              <input
                id="modal-contact-email"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (errors.email) setErrors({ ...errors, email: '' });
                }}
                placeholder="elena@example.com"
                className="w-full rounded-xl border border-white/15 bg-black/30 px-3.5 py-2.5 text-sm text-white placeholder-white/40"
              />
              {errors.email && <p className="mt-1 text-xs text-rose-300">{errors.email}</p>}
            </div>

            <div>
              <label htmlFor="modal-contact-topic" className="mb-1 block text-xs font-semibold text-white/80">
                Department
              </label>
              <select
                id="modal-contact-topic"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className="w-full rounded-xl border border-white/15 bg-[#031612] px-3.5 py-2.5 text-sm text-white"
              >
                <option value="Customer Support">Customer Support</option>
                <option value="Wholesale & Retail">Wholesale & Retail</option>
                <option value="Product & Nutrition">Product & Nutrition</option>
                <option value="Press & Partnerships">Press & Partnerships</option>
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="modal-contact-message" className="mb-1 block text-xs font-semibold text-white/80">
              Message *
            </label>
            <textarea
              id="modal-contact-message"
              rows={4}
              value={message}
              onChange={(e) => {
                setMessage(e.target.value);
                if (errors.message) setErrors({ ...errors, message: '' });
              }}
              placeholder="Tell us how we can help..."
              className="w-full rounded-xl border border-white/15 bg-black/30 px-3.5 py-2.5 text-sm text-white placeholder-white/40"
            />
            {errors.message && <p className="mt-1 text-xs text-rose-300">{errors.message}</p>}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <a
              href="#contact"
              onClick={() => onClose()}
              className="text-xs font-semibold text-white/70 underline hover:text-[#fbcfe8]"
            >
              Or view FAQs & support section ↓
            </a>
            <button
              type="submit"
              className="rounded-full bg-[#fbcfe8] px-6 py-3 text-sm font-extrabold text-[#011d17] transition hover:brightness-105"
            >
              Validate & Prepare Message
            </button>
          </div>
        </form>

        {submittedPayload && (
          <div
            role="status"
            className="mt-4 space-y-2.5 rounded-2xl border border-emerald-400/35 bg-emerald-500/10 p-4 text-xs"
          >
            <div className="font-bold text-emerald-200">
              ✓ Inquiry Validated & Saved Locally
            </div>
            <p className="text-white/80">
              Note: Direct server-side email delivery requires a configured email API endpoint (e.g.{' '}
              <code>VITE_CONTACT_API_URL</code>). Send your validated inquiry directly via your
              email client or copy it below:
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              <a
                href={`mailto:hello@soda.example?subject=${encodeURIComponent(
                  `[${submittedPayload.topic}] Inquiry from ${submittedPayload.name}`
                )}&body=${encodeURIComponent(
                  `Name: ${submittedPayload.name}\nEmail: ${submittedPayload.email}\nDepartment: ${submittedPayload.topic}\n\n${submittedPayload.message}`
                )}`}
                className="rounded-full bg-[#fbcfe8] px-4 py-2 font-extrabold text-[#011d17] hover:brightness-105"
              >
                Send via Email Client (mailto:)
              </a>
              <button
                type="button"
                onClick={handleCopy}
                className="rounded-full border border-white/20 bg-white/10 px-4 py-2 font-bold text-white hover:bg-white/20"
              >
                {copied ? '✓ Copied Message' : 'Copy Formatted Message'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
