/**
 * The Telegram channel, as its own mark.
 *
 * lucide has no Telegram glyph — only a generic paper plane, which reads as
 * "send" rather than as the brand — so the official mark is inlined here the
 * same way the Google and GitHub marks are inlined in SignInButtons.
 *
 * Drawn in currentColor rather than Telegram's blue. It sits in a row of
 * muted footer links and has to behave like one: faint at rest, ink on hover.
 * A brand-blue circle among grey text would be the loudest thing in the
 * footer, which is not what a footer link is for.
 */

/** Official Telegram mark, single path, sized like the GitHub one. */
function TelegramMark() {
  return (
    <svg
      className="h-[1.125rem] w-[1.125rem]"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
    >
      <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
    </svg>
  );
}

export const TELEGRAM_URL = "https://t.me/cvmaxxing";

export function TelegramLink({ className = "" }: { className?: string }) {
  return (
    <a
      href={TELEGRAM_URL}
      /*
       * Leaves the site, so it opens away from it — someone reading the
       * footer mid-application should not lose the posting they pasted.
       * noreferrer travels with noopener: the target has no business knowing
       * which page sent them.
       */
      target="_blank"
      rel="noopener noreferrer"
      /*
       * The only unlabelled control on the page, so the name is spoken rather
       * than seen. "Opens in a new tab" is part of it because a screen reader
       * user gets no other warning that focus is about to leave.
       */
      aria-label="cvmaxxing on Telegram — opens in a new tab"
      title="cvmaxxing on Telegram"
      className={`-m-2 inline-flex h-9 w-9 items-center justify-center rounded-md p-2 transition-colors hover:text-ink ${className}`}
    >
      <TelegramMark />
    </a>
  );
}
