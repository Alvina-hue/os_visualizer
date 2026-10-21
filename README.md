# OS Visualizer — Assignment project

A simple responsive operating-system scheduling visualizer made with HTML, CSS and vanilla JavaScript.

## Run

1. Open `index.html` in Chrome, Edge, or Firefox.
2. Choose Activity 1 or Activity 2, then click **Enter Input**.
3. Edit process arrival/burst values if needed, then click **Run simulation**.
4. Click **Compare assignment values** to compare the required quanta.

## Assignment defaults
- Activity 1: municipal services, Round Robin, quantum 2 ms, overhead 0 ms; comparison 2 vs 3 ms.
- Activity 2: climate emergency, Round Robin, quantum 2 ms, overhead 1 ms; comparison 2 vs 4 ms.
- Metrics: CT, TAT = CT - AT, WT = TAT - BT, RT = first CPU start - AT.
- CPU efficiency = total burst time / elapsed simulation time × 100%.

The page also supports FCFS as an optional extra, custom process inputs, random test data, add/remove process rows, and colour themes. The assignment's main algorithm is Round Robin.
