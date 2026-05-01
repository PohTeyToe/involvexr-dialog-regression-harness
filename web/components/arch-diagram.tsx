// Shared SVG architecture diagram used by /architecture and /present.
// Color-coded:
//   slate gray = existing Lumeto stack
//   primary blue = harness additions

export function ArchDiagram() {
  return (
    <div className="w-full overflow-x-auto">
      <svg
        viewBox="0 0 980 460"
        className="w-full h-auto min-w-[820px]"
        role="img"
        aria-label="Architecture diagram showing how the dialog regression harness sits above the gRPC surface of an InvolveXR-style backend."
      >
        <defs>
          <marker
            id="arch-arrow"
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--muted-foreground)" />
          </marker>
        </defs>

        {/* Clients tier */}
        <Tier x={20} y={20} w={940} h={70} label="Clients" />
        <Box x={40} y={40} w={170} h={42} title="Unreal VR client" />
        <Box x={220} y={40} w={170} h={42} title="Web (browser-based)" />
        <Box x={400} y={40} w={170} h={42} title="Desktop client" />
        <Box x={580} y={40} w={170} h={42} title="Pixel Streaming" />
        <Box x={760} y={40} w={180} h={42} title="Dialog Harness" highlighted subtitle="this repo" />

        {/* Edge */}
        <Tier x={20} y={120} w={940} h={70} label="Service edge" />
        <Box x={350} y={140} w={280} h={42} title="gRPC / HTTPS — ASP.NET Core" />

        {/* Services */}
        <Tier x={20} y={220} w={940} h={70} label="Backend services" />
        <Box x={60} y={240} w={200} h={42} title="ACF dialog service" subtitle="patient persona orchestration" />
        <Box x={290} y={240} w={200} h={42} title="Scenario service" subtitle="faculty scenario CRUD" />
        <Box x={520} y={240} w={200} h={42} title="Tenant / B2C service" subtitle="AAD-issued tokens" />
        <Box x={750} y={240} w={180} h={42} title="Telemetry collector" subtitle="OTel → App Insights" />

        {/* Infra */}
        <Tier x={20} y={320} w={940} h={120} label="Azure" />
        <Box x={60} y={340} w={200} h={42} title="Azure OpenAI / Anthropic" subtitle="LLM completions" />
        <Box x={290} y={340} w={200} h={42} title="Azure SQL" subtitle="scenario, run history" />
        <Box x={520} y={340} w={200} h={42} title="Service Bus" subtitle="run dispatch / fanout" />
        <Box x={750} y={340} w={180} h={42} title="Blob Storage" subtitle="run reports, traces" />
        <Box x={60} y={388} w={200} h={42} title="Azure Cache" subtitle="probe response cache" />
        <Box x={290} y={388} w={200} h={42} title="Key Vault" subtitle="API keys, JWT signing" />

        {/* Arrows */}
        <line x1="125" y1="82" x2="125" y2="120" stroke="var(--muted-foreground)" strokeWidth="1.2" markerEnd="url(#arch-arrow)" />
        <line x1="305" y1="82" x2="350" y2="140" stroke="var(--muted-foreground)" strokeWidth="1.2" markerEnd="url(#arch-arrow)" />
        <line x1="485" y1="82" x2="490" y2="140" stroke="var(--muted-foreground)" strokeWidth="1.2" markerEnd="url(#arch-arrow)" />
        <line x1="665" y1="82" x2="630" y2="140" stroke="var(--muted-foreground)" strokeWidth="1.2" markerEnd="url(#arch-arrow)" />
        <line x1="850" y1="82" x2="630" y2="140" stroke="var(--primary)" strokeWidth="1.6" strokeDasharray="4 3" markerEnd="url(#arch-arrow)" />
        <text x="868" y="105" fontSize="10" fill="var(--primary)" fontFamily="var(--font-geist-mono)">end-to-end</text>

        <line x1="490" y1="182" x2="490" y2="220" stroke="var(--muted-foreground)" strokeWidth="1.2" markerEnd="url(#arch-arrow)" />
        <line x1="160" y1="282" x2="160" y2="340" stroke="var(--muted-foreground)" strokeWidth="1.2" markerEnd="url(#arch-arrow)" />
        <line x1="390" y1="282" x2="390" y2="340" stroke="var(--muted-foreground)" strokeWidth="1.2" markerEnd="url(#arch-arrow)" />
        <line x1="620" y1="282" x2="620" y2="340" stroke="var(--muted-foreground)" strokeWidth="1.2" markerEnd="url(#arch-arrow)" />
        <line x1="840" y1="282" x2="840" y2="340" stroke="var(--muted-foreground)" strokeWidth="1.2" markerEnd="url(#arch-arrow)" />

        {/* legend */}
        <g transform="translate(660, 20)">
          <rect x="0" y="0" width="14" height="14" fill="var(--muted)" stroke="var(--border)" />
          <text x="20" y="11" fontSize="10" fill="var(--muted-foreground)">existing Lumeto stack</text>
          <rect
            x="180"
            y="0"
            width="14"
            height="14"
            fill="color-mix(in oklch, var(--primary) 22%, transparent)"
            stroke="var(--primary)"
          />
          <text x="200" y="11" fontSize="10" fill="var(--primary)">harness addition</text>
        </g>
      </svg>
    </div>
  );
}

function Tier({
  x,
  y,
  w,
  h,
  label,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
}) {
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        rx={6}
        fill="transparent"
        stroke="var(--border)"
        strokeDasharray="2 3"
      />
      <text
        x={x + 8}
        y={y - 4}
        fontSize="10"
        fill="var(--muted-foreground)"
        fontFamily="var(--font-geist-mono)"
      >
        {label}
      </text>
    </g>
  );
}

function Box({
  x,
  y,
  w,
  h,
  title,
  subtitle,
  highlighted,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  title: string;
  subtitle?: string;
  highlighted?: boolean;
}) {
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        rx={5}
        fill={
          highlighted
            ? "color-mix(in oklch, var(--primary) 18%, transparent)"
            : "var(--muted)"
        }
        stroke={highlighted ? "var(--primary)" : "var(--border)"}
        strokeWidth={highlighted ? 1.4 : 1}
      />
      <text
        x={x + w / 2}
        y={subtitle ? y + 17 : y + h / 2 + 4}
        fontSize="11"
        textAnchor="middle"
        fill={highlighted ? "var(--primary)" : "var(--foreground)"}
        fontWeight="500"
      >
        {title}
      </text>
      {subtitle && (
        <text
          x={x + w / 2}
          y={y + 32}
          fontSize="9"
          textAnchor="middle"
          fill="var(--muted-foreground)"
          fontFamily="var(--font-geist-mono)"
        >
          {subtitle}
        </text>
      )}
    </g>
  );
}
