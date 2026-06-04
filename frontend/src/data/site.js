import {
  Gauge,
  ShieldCheck,
  Headphones,
  Share2,
  Globe2,
  Cable,
  Cloud,
  Network,
  Lock,
  Zap,
  Award,
  Users,
} from "lucide-react";

export const STATS = [
  { icon: Gauge, value: "1 Gbps", label: "High Speed", desc: "Symmetrical bandwidth ready for enterprise workloads." },
  { icon: Share2, value: "100%", label: "Reliable", desc: "Redundant rings & 99.95% uptime SLA." },
  { icon: ShieldCheck, value: "Secure", label: "Network", desc: "Hardened perimeter with managed firewalls." },
  { icon: Headphones, value: "24/7", label: "Support", desc: "Local NOC on-call, every hour of every day." },
];

export const SERVICES = [
  {
    icon: Globe2,
    title: "Internet Leased Line",
    summary: "High performance dedicated internet for your business.",
    detail: "Symmetric, low-latency leased lines with guaranteed bandwidth. Static IPs, redundant routing and 99.95% uptime SLAs designed for mission-critical operations.",
  },
  {
    icon: Cable,
    title: "Fiber Connectivity",
    summary: "Lightning fast fiber connections for seamless experience.",
    detail: "Dedicated fiber links built on resilient ring topology. From last-mile to data centre cross-connects, we engineer the path your packets travel.",
  },
  {
    icon: Network,
    title: "Network Solutions",
    summary: "End-to-end networking solutions tailored for your needs.",
    detail: "LAN/WAN design, SD-WAN, structured cabling, switching and routing. We architect, deploy and manage the entire network stack.",
  },
  {
    icon: Lock,
    title: "Security Solutions",
    summary: "Advanced security to protect your business always.",
    detail: "Managed firewalls, VPNs, DDoS mitigation and 24/7 SOC monitoring. Defence-in-depth designed for SMB and enterprise alike.",
  },
  {
    icon: Cloud,
    title: "Cloud Services",
    summary: "Scalable cloud solutions to grow your business smarter.",
    detail: "Hybrid and multi-cloud connectivity, private cloud hosting, backup and disaster recovery. Cloud that talks to your network natively.",
  },
  {
    icon: Headphones,
    title: "24/7 Support",
    summary: "Round the clock support for uninterrupted connectivity.",
    detail: "Local NOC engineers, 15-minute response on critical tickets, on-site dispatch and proactive monitoring keep you online.",
  },
];

export const PLANS = [
  {
    name: "Basic",
    speed: "50",
    unit: "Mbps",
    popular: false,
    features: ["Unlimited Data", "High Speed", "24/7 Support", "Standard Installation", "Free Wi-Fi Router"],
    blurb: "Perfect for small offices and home professionals.",
  },
  {
    name: "Premium",
    speed: "100",
    unit: "Mbps",
    popular: true,
    features: ["Unlimited Data", "High Speed", "24/7 Support", "Priority Support", "Free Installation", "Backup Connectivity"],
    blurb: "Most popular pick for growing teams and SMBs.",
  },
  {
    name: "Ultra",
    speed: "200",
    unit: "Mbps",
    popular: false,
    features: ["Unlimited Data", "High Speed", "24/7 Support", "Priority Support", "Static IP", "Dedicated Account Manager"],
    blurb: "Built for enterprises that cannot afford downtime.",
  },
];

export const VALUES = [
  { icon: Zap, title: "Speed-first engineering", text: "We obsess over latency, jitter and throughput so your apps feel local." },
  { icon: Award, title: "Locally rooted, nationally capable", text: "Bhopal-headquartered, with field engineers across Madhya Pradesh and beyond." },
  { icon: Users, title: "Customers, not tickets", text: "A dedicated account manager who actually picks up the phone." },
];

export const CONTACT = {
  phone: "+91 93024 52424",
  phoneRaw: "+919302452424",
  email: "contact@insightnet.in",
  web: "www.insightnet.in",
  address: "Block-B Aashima Royal City, Bhopal-462043, Madhya Pradesh, India",
};
