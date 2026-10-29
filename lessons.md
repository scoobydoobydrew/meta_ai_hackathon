Lessons learned: verified knockout agent
Design decisions and why
The LLM proposes, an exact solver judges. Language models guess confidently. A formal checker over every long-term state of the network, including oscillations, makes each claim testable.
Failures steer the search. Each failed proposal returns a surviving state. Only genes active in that state can break it, so the search is complete. It either finds every minimal solution or proves none exists, and “impossible” becomes a real answer.
Explanations are checked. Each one is cut into proof steps that are re-verified against the rules. A free-text summary had produced real errors, so I removed it.
Thin provider seam, labelled fallbacks, offline mode. Anything unreachable degrades visibly, never silently.
Evidence by default. Every request, retrieval and run writes a log, so a reviewer can see how an answer arose.
What we measured
On eight scenarios with exhaustive ground truth, the model alone proposed wrong sets about 91% of the time. It invented an answer where none existed.
The symbolic search alone found every answer with roughly 34 times fewer solver calls than brute force. It also proved impossibility cheaply.
The language model added no search power on this network. Its value was the interface, SQL, wording and memory.
A larger model improved explanation wording but not proposals.
With thinking enabled, replies took minutes; with it off, about two seconds.
The exact engine tops out near 21 free nodes. A 53-node network returned “unknown”.
Pitfalls and failures
I read requirements late and found that the sponsor’s AI gateway was mandatory, after building against a direct provider. I also assumed a GPU was required; it wasn’t.
Pinned dependencies broke installs on older Python. A container check caught it.
A module import silently disabled logging for live runs.
Early history contained a default password and out-of-window commits. I fixed both by rewriting history.
Several hand-written code blocks were corrupted by newline escaping.
Nightshift caches repeated prompts, which can make a replay look live unless flagged.
Overclaiming (“only exit is X”, “proves safe”) needed repeated correction. The honest limits slide earned more trust.
What I would do differently
Read every requirement and rule document on day one, and confirm the mandatory sponsor integrations first.
Install the sponsor tools early and test with real credentials before building around assumptions.
Build logging, offline mode and a container build from the start, and test a clean clone daily.
Measure the baseline before investing in LLM cleverness.
Keep commit dates clean from the first commit.
Script demo and deck generation early so they can be rerun cheaply.
Run a secrets scan across history before any push.