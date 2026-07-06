// Educational content for every interactable equipment type.

export interface EquipInfo {
  title: string
  techName: string
  simple: string
  purpose: string
  fact: string
}

export const EQUIP_INFO: Record<string, EquipInfo> = {
  server: {
    title: 'Server',
    techName: '1U rack-mount compute node',
    simple:
      'A server is a powerful computer without a screen or keyboard. When you open a website or app, a machine like this one somewhere in the world does the actual work.',
    purpose: 'Runs websites, apps, databases and AI workloads for people all over the internet.',
    fact: 'A single modern server can handle thousands of website visitors at the same time.',
  },
  rack: {
    title: 'Server Rack',
    techName: '42U 19-inch equipment rack',
    simple:
      'A rack is a tall metal cabinet that holds many servers stacked like pizza boxes. Racks keep everything organized, secure, and easy to cool.',
    purpose: 'Houses servers, feeds them power, and channels cool air through their fronts.',
    fact: 'Rack positions are measured in "U" — one U is 1.75 inches (4.4 cm) tall.',
  },
  cooling: {
    title: 'Cooling Unit',
    techName: 'CRAC — Computer Room Air Conditioner',
    simple:
      'This machine blows cold air toward the front of the server racks and removes the heat the servers create. Without it, servers overheat within minutes.',
    purpose: 'Keeps the cold aisle cold and carries server heat out of the building.',
    fact: 'Cooling can consume nearly as much electricity as the servers themselves — that is why efficiency (PUE) matters so much.',
  },
  ups: {
    title: 'UPS System',
    techName: 'Uninterruptible Power Supply (double-conversion)',
    simple:
      'A giant battery cabinet. If the electricity from the grid fails, the UPS instantly keeps the servers running — but only for a short time, until the generator takes over.',
    purpose: 'Bridges the gap between a grid failure and the backup generator starting.',
    fact: 'The UPS in this hall only backs the servers — cooling is too power-hungry, so it waits for the generator. Watch temperatures climb during an outage!',
  },
  generator: {
    title: 'Backup Generator',
    techName: 'Standby diesel generator set',
    simple:
      'A big engine that makes electricity when the grid fails. It needs a few seconds to start — the UPS batteries cover that gap.',
    purpose: 'Provides long-term backup power for the whole facility during outages.',
    fact: 'Real data centers keep enough diesel on site to run for 24–72 hours, with refuelling contracts on top.',
  },
  netcab: {
    title: 'Network Cabinet',
    techName: 'MDF — core switching & fiber uplink',
    simple:
      'The doorway between this building and the internet. Every request from the outside world enters here through fiber-optic cables, then gets directed to the right server.',
    purpose: 'Connects all servers to each other and to the internet through switches and routers.',
    fact: 'The fiber-optic cables here carry data as pulses of light — at hundreds of gigabits per second.',
  },
  noc: {
    title: 'Monitoring Station',
    techName: 'NOC — Network Operations Center console',
    simple:
      'The control room desk. Operators watch dashboards showing temperatures, power and alerts — and jump into action when something breaks.',
    purpose: 'Shows live health of the whole facility and coordinates incident response.',
    fact: 'Big cloud providers monitor millions of metrics per second across their data centers.',
  },
  badge: {
    title: 'Badge Kiosk',
    techName: 'Visitor access-control terminal',
    simple:
      'Data centers guard the machines that hold everyone’s data, so you can’t just walk in. Scan a visitor badge here to unlock the hall.',
    purpose: 'Issues access credentials and logs everyone who enters.',
    fact: 'High-security facilities use "mantraps" — double doors where the first must close before the second opens.',
  },
  reception: {
    title: 'Reception Desk',
    techName: 'Front-of-house security desk',
    simple:
      'Welcome to RackLab! Every visit starts here. Check in, grab a badge from the kiosk, and head through the security door into the server hall.',
    purpose: 'First layer of physical security: identity checks and visitor logging.',
    fact: 'Many data centers are anonymous buildings with no company logo — security through obscurity.',
  },
}

// Follow-a-Request storyline steps. Fractions are positions along the packet
// path curve where each caption begins.
export const REQUEST_STEPS: { at: number; title: string; text: string; tech: string }[] = [
  {
    at: 0,
    title: '1 · You press Enter',
    text: 'Someone far away opens a website. Their request races here through fiber-optic cables under streets and oceans.',
    tech: 'DNS resolved the domain to this facility’s IP. TCP + TLS handshakes complete in milliseconds.',
  },
  {
    at: 0.1,
    title: '2 · Security check',
    text: 'The request enters through the network cabinet, where a firewall checks it isn’t malicious.',
    tech: 'Edge router → firewall: packet filtering, DDoS scrubbing, then NAT to the internal network.',
  },
  {
    at: 0.24,
    title: '3 · The load balancer decides',
    text: 'A load balancer looks at all the servers and picks one that isn’t too busy to handle this request.',
    tech: 'L7 load balancer terminates TLS and picks a healthy backend via least-connections.',
  },
  {
    at: 0.4,
    title: '4 · A server does the work',
    text: 'The chosen web server runs the application code to build the page.',
    tech: 'App server executes business logic; ~1–50 ms of CPU time on srv-a2-3.',
  },
  {
    at: 0.55,
    title: '5 · Fetching your data',
    text: 'The server asks a storage server in another rack for the data it needs — your photos, posts or account info.',
    tech: 'Query to the database tier in rack B1 over the east-west network; SSD read in microseconds.',
  },
  {
    at: 0.72,
    title: '6 · The response heads home',
    text: 'The finished page travels back through the switches and out to the internet.',
    tech: 'Response serialized, compressed, and routed back through the same network path.',
  },
  {
    at: 0.88,
    title: '7 · The page appears',
    text: 'Milliseconds after the click, the website appears on the visitor’s screen. All of this — every single time.',
    tech: 'Total round trip: often < 200 ms including transit. Billions of requests flow like this every minute.',
  },
]
