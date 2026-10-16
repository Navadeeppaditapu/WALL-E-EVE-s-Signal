# Demo guide: explain it in plain words

## The 30-second pitch
"WALL-E is looking for EVE but can't see her. It only gets noisy clues. So
instead of guessing one location, it keeps a probability for every cell and
updates it with Bayes' rule after each clue. It chooses actions that teach it
the most per unit of battery, and it never goes so far that it can't get home."

## The three ideas, simply
**Bayesian belief.** Start with "EVE could be anywhere (1% each)". A ping fires:
cells near WALL-E become more likely, far cells less. Multiply, then rescale so
it all adds up to 100% again. Repeat after every clue.

**POMDP-style.** In a normal planning problem you know where everything is.
Here the true state (EVE's cell) is hidden, so WALL-E decides based on its
*belief* about the state. That is what "partially observable" means.

**Safe return.** Before any action WALL-E checks: "after this, can I still
afford the walk home plus 2 spare?" If not, the action is banned.

## Why is the sensor noisy?
Real sensors make mistakes. If clues were always right there'd be nothing to
reason about. The noise (`ping_p_false_alarm` = 10%) also stops one wrong clue
from ruling out the true cell forever.

## What is "uncertainty / entropy"?
One number for "how confused is WALL-E?". 6.6 bits = no idea (100 equal cells).
0 bits = certain. The chart in the visualization shows it falling.

## How does it choose an action?
For each safe action it estimates: "on average, how much would this reduce my
uncertainty, per battery unit?" Scanning also gets a bonus for the chance of
actually finding EVE. Moves are valued by the best sensing possible from the
new cell. It takes the highest score.

## Likely questions, with honest answers
- **Is this a real POMDP solver?** No. It's a greedy, one-step-lookahead
  approximation. It uses POMDP ideas (belief state, acting on belief) but does
  not compute an optimal policy.
- **Why does it sometimes fail?** With the default battery it finds EVE about
  94% of the time. Failures are cases where the battery runs out first; it
  then returns home safely rather than get stranded.
- **Can the sensor be wrong?** Yes, on purpose (80% / 10% for pings, 90% for scans).
- **What happens with a different seed?** A different hidden EVE location and
  different sensor noise: `python run_simulation.py --seed 12`.
- **What would you improve?** Multi-step lookahead or a proper POMDP solver,
  moving EVE, recharging at base, several robots.

## Good demo order
1. Open `outputs/visualization.html`, press Play.
2. Point at the heatmap: "it starts flat, then concentrates".
3. Point at the uncertainty chart falling.
4. Show a ping diamond: green = fired.
5. Show the battery bar and the end: found EVE, or walked home safely.
6. Run `python run_simulation.py --batch 100` to show the success rate.
