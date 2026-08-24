import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;
const Base = ({ children, ...props }: IconProps) => <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>{children}</svg>;

export const HomeIcon = (p: IconProps) => <Base {...p}><path d="m3 11 9-8 9 8"/><path d="M5.5 10v10h13V10M9 20v-6h6v6"/></Base>;
export const SparkleIcon = (p: IconProps) => <Base {...p}><path d="M12 3c.8 4 3 6.2 7 7-4 .8-6.2 3-7 7-.8-4-3-6.2-7-7 4-.8 6.2-3 7-7Z"/><path d="M19 16c.3 1.5 1.2 2.4 2.7 2.7-1.5.3-2.4 1.2-2.7 2.7-.3-1.5-1.2-2.4-2.7-2.7 1.5-.3 2.4-1.2 2.7-2.7Z"/></Base>;
export const OperateIcon = (p: IconProps) => <Base {...p}><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4M16 3v4M3 10h18M8 14h3M8 17h7"/></Base>;
export const InsightIcon = (p: IconProps) => <Base {...p}><path d="M4 19V9M10 19V4M16 19v-7M22 19V7"/></Base>;
export const SettingsIcon = (p: IconProps) => <Base {...p}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-1.6v-.2h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z"/></Base>;
export const ArrowIcon = (p: IconProps) => <Base {...p}><path d="m9 18 6-6-6-6"/></Base>;
export const CheckIcon = (p: IconProps) => <Base {...p}><path d="m5 12 4 4L19 6"/></Base>;
