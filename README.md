# RackLab

> **▶ Quick start**
>
> ```bash
> npm install
> npm run dev        # → http://localhost:5180
> ```
>
> Built with Vite + React + TypeScript + Three.js (React Three Fiber) + Zustand. No backend needed — the whole simulation runs in your browser.
>
> **Controls:** WASD/arrows move · mouse looks · click or `E` interacts · `T` thermal view · `M` mute · `Shift` run · `Esc` releases the mouse.
>
> **What's in the MVP:** lobby with badge security, a server hall with 6 openable racks and 36 live-simulated servers, 2 CRAC cooling units, UPS + diesel generator power chain, network core cabinet, live NOC monitoring desk, Beginner/Engineer modes, thermal view, the "Follow a Request" packet chase, an overheating-rack mission, a power-outage experiment, procedural ambient audio, and achievements.

---

The original product brief follows.

Build a polished, playful, browser-based **interactive 3D data center experience** designed for people who have never been inside a data center.

The project should feel like a mix of a virtual museum, an educational game, and an interactive simulation. Users should be able to walk through a realistic 3D data center, inspect equipment, interact with infrastructure, complete small missions, and visually understand how servers, networking, cooling, power, and cloud computing work.

The experience should not feel like a traditional enterprise dashboard. It should be visually engaging, beginner-friendly, interactive, and fun to explore.

## Core Product Goal

Create an immersive 3D environment where users can:

* Walk around inside a data center.
* Explore different rooms and infrastructure areas.
* Click, open, move, and inspect equipment.
* Learn what each component does through simple explanations.
* Perform realistic data-center tasks.
* Trigger failures and observe their consequences.
* Complete guided missions and mini-games.
* Switch between beginner-friendly explanations and deeper technical information.

The project should teach through interaction rather than through long articles or static diagrams.

## Target Users

The primary users are:

* Students learning about cloud computing.
* Software engineers who have never visited a data center.
* Beginners interested in servers and infrastructure.
* People curious about how websites and cloud applications physically operate.
* Educators looking for an interactive teaching tool.
* New data-center or IT employees learning basic infrastructure concepts.

## Main Experience

The user begins outside or in the lobby of a modern data center. A short introduction explains that nearly every website, application, video, AI tool, and cloud service depends on physical infrastructure like the equipment inside this building.

The user can then enter the facility and explore it in first-person or third-person mode.

Movement should feel similar to a simple exploration game:

* Move using WASD or arrow keys.
* Look around using the mouse.
* Click equipment to interact with it.
* Use an optional guided-tour mode.
* Display clear controls for first-time users.
* Support desktop browsers initially.

## Data Center Areas

The environment should contain several recognizable areas.

### 1. Lobby and Security Entrance

Include:

* Reception desk.
* Security checkpoint.
* Access-card scanner.
* Cameras.
* Biometric scanner.
* Restricted-access doors.
* Visitor badge station.

Interactions could include:

* Scanning an access card.
* Learning why data centers have strong physical security.
* Trying to enter a restricted room without authorization.
* Completing a short security onboarding task.

### 2. Main Server Hall

Include:

* Rows of server racks.
* Hot and cold aisles.
* Rack labels and location numbers.
* Blinking server lights.
* Visible network and power cables.
* Raised flooring or overhead cable trays.
* Server fans and realistic ambient sound.

Users should be able to:

* Walk between racks.
* Open rack doors.
* Inspect individual servers.
* Pull out a server tray.
* View CPU, memory, storage, temperature, and workload information.
* Turn a server on or off.
* Identify healthy, warning, and failed servers.
* Add or remove a server in selected scenarios.

### 3. Networking Area

Include:

* Network switches.
* Routers.
* Fiber connections.
* Patch panels.
* Ethernet cables.
* Internet uplink equipment.

Users should be able to:

* Trace a network cable.
* Connect a server to a switch.
* Disconnect a cable and observe the result.
* Follow a request as it travels through the network.
* Learn the difference between a server, switch, router, and firewall.

### 4. Cooling Area

Include:

* CRAC or cooling units.
* Air vents.
* Hot-air exhaust.
* Cold-air delivery.
* Temperature sensors.
* Fans and cooling pipes.

Users should be able to:

* Turn cooling units on or off.
* Activate a thermal-view overlay.
* Watch animated airflow.
* See hot and cold aisles.
* Observe server temperatures increasing when cooling fails.
* Repair or restart a failed cooling unit.

### 5. Power Infrastructure

Include:

* Main electrical supply.
* UPS systems.
* Batteries.
* Power distribution units.
* Backup generators.
* Rack-level power strips.
* Emergency power controls.

Users should be able to:

* Follow electricity from the grid to a server.
* Turn off the main power.
* Watch the UPS temporarily keep systems running.
* Start a backup generator.
* Inspect remaining battery time.
* Reconnect power to a rack.
* Learn why redundant power systems are important.

### 6. Network Operations Center

Include:

* Large monitoring screens.
* Facility maps.
* Server-health dashboards.
* Temperature maps.
* Security-camera feeds.
* Active alerts.
* Incident timelines.

Users should be able to:

* Review alerts.
* Locate failed equipment.
* Acknowledge incidents.
* Start a repair mission.
* View the overall health of the data center.
* Replay previous incidents.

## Core Interaction Features

Every important object should provide at least one of the following:

* Something the user can inspect.
* Something the user can operate.
* Something the user can change.
* Something the user can repair.
* Something the user can learn from.

Avoid filling the environment with decorative objects that have no purpose.

When a user selects equipment, show a clean information card containing:

* Equipment name.
* Simple description.
* Technical name.
* Purpose.
* Current status.
* Related systems.
* One interesting fact.
* Available actions.

Example:

**Cooling Unit**

Simple explanation:
“This machine sends cold air toward the front of the server racks and removes the heat created by running servers.”

Technical details:

* Current temperature.
* Cooling capacity.
* Fan speed.
* Power consumption.
* Operational status.

Available actions:

* Turn off.
* Restart.
* Inspect.
* Show airflow.
* Trigger simulated failure.

## Beginner and Engineer Modes

Include two learning modes.

### Beginner Mode

Use:

* Simple language.
* Short explanations.
* Visual animations.
* Friendly tooltips.
* Guided interactions.
* Minimal technical jargon.

For example:

“This switch connects many servers so they can communicate.”

### Engineer Mode

Show deeper information such as:

* IP addresses.
* Rack unit positions.
* CPU and GPU utilization.
* Network throughput.
* Packet loss.
* Power consumption.
* Temperature.
* Redundancy status.
* Server dependencies.
* Cooling capacity.
* Estimated PUE.

Users should be able to switch modes at any time.

## Guided Tour Mode

Include an optional guided tour led by a small AI assistant, floating robot, holographic character, or animated guide.

The guide should take the user through the facility in a logical sequence:

1. Physical security.
2. Power systems.
3. Cooling systems.
4. Networking.
5. Server racks.
6. Storage.
7. Monitoring and incident response.

The guide should explain concepts using short conversational messages.

The user should be able to:

* Follow the guide.
* Skip sections.
* Ask basic predefined questions.
* Pause the tour.
* Enter free-exploration mode.

## Follow a Web Request Experience

Create an interactive educational sequence called **Follow a Request**.

The user clicks a button such as:

“Open a website.”

The experience should visually demonstrate:

1. A request arrives from the internet.
2. It passes through security and networking equipment.
3. A load balancer directs it to a server.
4. The server processes the request.
5. The server retrieves data from storage or a database.
6. The response travels back through the network.
7. The website appears on the user’s screen.

Use:

* Animated light paths.
* Highlighted cables.
* Directional arrows.
* Short explanations.
* Optional technical details.

Users should be able to slow down, pause, or replay the sequence.

## Thermal and Infrastructure Views

Provide visual modes that help users understand hidden systems.

Include:

* Normal physical view.
* Thermal heat-map view.
* Airflow view.
* Power-flow view.
* Network-flow view.
* Equipment-health view.

Examples:

* Thermal mode colors racks based on temperature.
* Power mode highlights the path from the utility supply to each rack.
* Network mode shows active data moving between servers and switches.
* Health mode highlights normal, warning, and critical components.

## Playful Experiments

Include a safe experiment mode where users can intentionally change the environment.

Possible actions:

* Turn off a server.
* Disconnect a network cable.
* Shut down a cooling unit.
* Cut the main power.
* Overload a rack.
* Add too many servers.
* Block an air vent.
* Increase website traffic.
* Start a GPU-heavy AI workload.
* Open several rack doors.
* Disable a backup system.

The environment should clearly demonstrate the consequences through:

* Temperature changes.
* Warning lights.
* Alarm sounds.
* Slower workloads.
* Failed requests.
* Power reduction.
* Server shutdowns.
* Alerts in the operations center.

After each experiment, explain what happened and why.

## Missions and Mini-Games

Add short missions that give users a reason to explore.

### Mission 1: Find the Overheating Server

A rack is getting too hot.

The user must:

* Read the alert.
* Find the correct rack.
* Inspect server temperatures.
* Identify the failed cooling fan or blocked vent.
* Fix the problem.
* Confirm temperatures return to normal.

### Mission 2: Restore Power

The primary electrical supply has failed.

The user must:

* Check the UPS.
* Start the backup generator.
* Restore power to affected racks.
* Verify that critical services remain online.

### Mission 3: Connect a New Server

The user must:

* Install a server in the correct rack.
* Connect power.
* Connect the network cable.
* Assign the server to a workload.
* Confirm that it appears online.

### Mission 4: Fix a Network Outage

Several servers cannot communicate.

The user must:

* Trace the network path.
* Find a disconnected or incorrect cable.
* Reconnect it to the correct switch port.
* Verify traffic is restored.

### Mission 5: Handle a Traffic Spike

A website suddenly receives many visitors.

The user must:

* Observe server utilization.
* Start additional servers.
* Redirect traffic.
* Keep response times within an acceptable range.

### Mission 6: Reduce Energy Consumption

The data center is using too much electricity.

The user must:

* Identify underused servers.
* Consolidate workloads.
* Shut down unnecessary equipment.
* Adjust cooling.
* Maintain performance while lowering energy use.

## Build Mode

After users understand the basics, provide a simple build mode.

Give the user an empty data-center room and a limited budget.

Allow them to place:

* Server racks.
* Servers.
* Network switches.
* Cooling systems.
* UPS units.
* Generators.
* Sensors.
* Cable connections.

Evaluate their design based on:

* Cooling efficiency.
* Power redundancy.
* Network connectivity.
* Capacity.
* Reliability.
* Cost.
* Energy usage.

The system should explain design problems, such as:

* A rack has no network connection.
* Too many servers are connected to one circuit.
* Cooling capacity is insufficient.
* There is no backup power.
* Hot and cold aisles are configured incorrectly.

## Progress and Rewards

Make the experience motivating without turning it into a complicated game.

Include:

* Achievement badges.
* Completed mission tracking.
* Exploration percentage.
* Equipment discovered.
* Hidden facts.
* Data-center knowledge score.
* Optional leaderboard for challenge scores.

Possible badges:

* First Server Boot.
* Cooling Technician.
* Network Detective.
* Power Restorer.
* Data Center Explorer.
* Zero Downtime.
* Energy Saver.

## Visual and Audio Direction

The environment should feel realistic but slightly stylized so that it remains approachable and performs well in the browser.

Visual requirements:

* Clean modern data center.
* Realistic server racks.
* Animated indicator lights.
* Smooth door and equipment animations.
* Clear object highlighting.
* Soft lighting.
* Readable labels.
* Simple visual effects for heat, power, airflow, and network traffic.
* Responsive user interface.
* High visual polish without requiring photorealism.

Audio requirements:

* Low server-fan ambience.
* Electrical hum.
* Louder fans near server racks.
* Different sounds near cooling systems.
* Warning alarms during failures.
* Interaction sounds for switches, doors, and buttons.
* Adjustable or muteable audio.

## User Interface

The interface should remain minimal while the user is exploring.

Include:

* Small crosshair or interaction indicator.
* Context-sensitive interaction prompt.
* Mini-map or floor map.
* Mission objective panel.
* Equipment information cards.
* Current facility status.
* View-mode selector.
* Beginner/Engineer mode toggle.
* Settings and controls menu.

Avoid covering too much of the 3D environment with dashboards.

## Accessibility

Include:

* Keyboard and mouse support.
* Adjustable mouse sensitivity.
* Subtitles for guide narration.
* Reduced-motion option.
* Color-blind-friendly status indicators.
* Text labels in addition to colors.
* Adjustable audio.
* Clear navigation controls.
* Alternative guided navigation for users uncomfortable with first-person movement.

## Technical Direction

Build this as a web application.

Suggested technology stack:

* Next.js
* React
* TypeScript
* Three.js
* React Three Fiber
* React Three Drei
* Zustand for application state
* Tailwind CSS for interface styling
* Framer Motion for UI animations
* WebSockets for live simulation updates
* Node.js, FastAPI, or Spring Boot for backend services
* PostgreSQL or Supabase for user progress and saved scenarios

Use optimized low-poly or medium-poly 3D assets so that the environment loads quickly and runs smoothly in modern browsers.

Important performance requirements:

* Lazy-load rooms and models.
* Reuse repeated server-rack assets.
* Use instancing for server lights and repeated equipment.
* Compress 3D models.
* Limit unnecessary shadows.
* Use level-of-detail where appropriate.
* Show a loading progress screen.
* Target smooth performance on standard laptops.

## Simulation Architecture

The equipment should have meaningful state rather than being purely decorative.

Each major component should include properties such as:

* ID.
* Type.
* Location.
* Status.
* Temperature.
* Power usage.
* Network status.
* Health.
* Parent rack or room.
* Connected equipment.
* Available interactions.

Create simple relationships between systems.

Examples:

* Servers depend on power and networking.
* Server temperature depends on workload and cooling.
* Cooling systems depend on electrical power.
* Network connectivity depends on switches and cables.
* UPS systems support equipment for a limited duration.
* Generators require time to start.
* A failed component should affect connected systems.

The simulation does not need to be scientifically perfect, but the cause-and-effect relationships should feel logical and educational.

## MVP Scope

Start with one highly polished server hall instead of building a massive facility.

The first version should include:

* A lobby or entrance.
* One server hall.
* Six interactive server racks.
* Clickable and openable rack doors.
* Several inspectable servers.
* One networking cabinet.
* Two cooling units.
* One UPS system.
* One monitoring station.
* First-person exploration.
* Beginner-friendly equipment explanations.
* Beginner and Engineer modes.
* Normal and thermal views.
* The Follow a Request sequence.
* One overheating mission.
* One power-failure experiment.
* Sound effects and ambient audio.
* Basic achievements.
* A polished landing page explaining the experience.

## Future Features

Design the architecture so that future versions could add:

* Multiple server halls.
* Multiplayer exploration.
* Virtual classroom mode.
* VR support.
* AI-generated missions.
* Real-world data-center layouts.
* User-created facilities.
* More advanced capacity planning.
* Cybersecurity scenarios.
* Fire-detection and suppression systems.
* Water-leak scenarios.
* Renewable energy and sustainability simulations.
* Cloud-provider-themed environments.
* Mobile or tablet support.

## Product Identity

The product should feel playful, modern, educational, and technically credible.

Possible project names include:

* Data Center Explorer
* Inside the Cloud
* Cloud Facility
* ServerVerse
* RackLab
* Data Center Playground
* InfraQuest
* CloudCore
* Behind the Cloud
* Server Hall Simulator

A concise product description could be:

“An interactive 3D data-center playground where users explore physical cloud infrastructure, operate equipment, complete missions, and learn how servers, networking, cooling, and power systems work.”

The final experience should make users feel that they have visited a data center, touched the equipment, experimented with the infrastructure, and understood something meaningful about how the internet and cloud computing work.
