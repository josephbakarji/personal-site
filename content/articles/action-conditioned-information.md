# Action-Conditioned Information: Compression Should Be Measured by What It Does

Classical information theory evaluates compression by how faithfully symbols are reconstructed. I argue this is the wrong metric. The purpose of information is to produce behavior: a compressed representation is good if the actions it induces are equivalent to those induced by the original.

## 1. The Problem with Symbol Fidelity

Information theory was born as a theory of communication. Its central objects---entropy, mutual information, channel capacity---answer a specific question: *how many bits are needed to transmit a message so that the receiver can reconstruct it?* Rate-distortion theory relaxes exact reconstruction, asking how many bits suffice when a certain amount of distortion is tolerable. But in both cases, the evaluation criterion is the same: fidelity of the reconstructed *symbols*.

This criterion, while appropriate for telephone lines and JPEG images, becomes inadequate when the receiver is an intelligent agent. Consider prompting a large language model with "simulate the Lorenz system." This five-word string has negligible Shannon information compared to the hundreds of lines of working code the model produces. The message is not being *reconstructed*; it is being *acted upon*. Its information content, in any operationally meaningful sense, is not in the symbols but in the behavior they elicit.

**The core claim**: compression should be evaluated by the equivalence of the actions it produces, not by the fidelity of the symbols it reconstructs. Two compressed representations $Y$ and $Y'$ of a source $X$ are equivalent if they induce the same behavior in the decoder, regardless of how different they appear as strings.

## 2. Background

### Rate-Distortion Theory

Given a source $X$ with distribution $p(x)$, the rate-distortion function is:

$$R(D) = \min_{p(\hat{x}|x): \, \mathbb{E}[d(X,\hat{X})] \leq D} I(X; \hat{X})$$

where $d(x, \hat{x})$ is a distortion measure defined on the reconstruction space. The critical assumption is that $d$ compares $x$ and $\hat{x}$ in the *same space*---the space of messages.

### The Information Bottleneck

The information bottleneck generalizes rate-distortion by introducing a relevance variable $Y$. Given a Markov chain $Y - X - T$, the objective is:

$$\min_{p(t|x)} \big[ I(X; T) - \beta \, I(T; Y) \big]$$

This is a decisive step toward task-relevant compression: the bottleneck retains only what matters for predicting $Y$, discarding the rest. However, $Y$ is still a random variable in observation space, not a behavioral outcome.

### Kolmogorov Complexity

Kolmogorov complexity $K(x)$ is the length of the shortest program that produces $x$ on a universal Turing machine $U$. A crucial feature is that $K$ is defined *relative to* the choice of $U$: different machines yield complexities that differ by at most an additive constant.

This relativity is typically treated as a technicality. I argue it is the central insight: the compressibility of a message depends on the computational power of the decoder. "Simulate Lorenz" has high Kolmogorov complexity relative to a machine that only copies symbols, and low complexity relative to one that understands differential equations. The "additive constant" absorbs the entire intelligence of the decoder.

## 3. Action-Conditioned Distortion

### Setup

Let $X$ be a source message, $\mathcal{A}$ a space of actions, and $\pi: \mathcal{M} \times \mathcal{S} \to \mathcal{P}(\mathcal{A})$ a *decoder policy* that maps a received message $m \in \mathcal{M}$ and an internal state $s \in \mathcal{S}$ to a distribution over actions. Here $\mathcal{S}$ encodes the decoder's knowledge, capabilities, and context---what we colloquially call its "intelligence."

Given an encoder $f: \mathcal{X} \to \mathcal{M}$ that compresses $X$ into $M = f(X)$, the decoder produces an action:

$$A = \pi(M, S)$$

### The Distortion Measure

Let $d_\mathcal{A}: \mathcal{A} \times \mathcal{A} \to \mathbb{R}_{\geq 0}$ be a metric on the action space. The *action-conditioned distortion* between two encoded representations $M$ and $M'$ of the same source $X$, given decoder policy $\pi$ and state $S$, is:

$$D_\pi(M, M') = \mathbb{E}\big[ d_\mathcal{A}\big(\pi(M, S),\; \pi(M', S)\big) \big]$$

When $D_\pi(M, M') = 0$, the two representations are *action-equivalent*: they produce identical behavior despite potentially differing as symbol strings. The classical distortion $d(x, \hat{x})$ is recovered as a special case when $\pi$ is the identity and $\mathcal{A} = \mathcal{X}$.

### Action-Conditioned Rate-Distortion

We can define a rate-distortion function conditioned on the decoder:

$$R_\pi(D) = \min_{\substack{p(m|x): \\ \mathbb{E}[d_\mathcal{A}(\pi(m,S),\, A^*(X))] \leq D}} I(X; M)$$

where $A^*(X)$ is the *reference action*---the action that would be produced given full access to $X$. This is the minimum bit rate needed to induce behavior within distortion $D$ of the reference behavior.

**Decoder dependence**: For any source $X$ and distortion level $D > 0$, the action-conditioned rate $R_\pi(D)$ is a non-increasing function of decoder capability. A more capable decoder expands the feasible set in the minimization, since coarser encodings that would cause action-distortion under a weaker decoder may be correctly interpreted by a stronger one.

This formalizes a familiar intuition: you can be terser with a smarter listener. But it also means that **the information content of a message is not intrinsic to the message**---it is a joint property of the message and the decoder's intelligence.

### Behavioral Equivalence Classes

Given a decoder $\pi$ and state $S$, define the *behavioral equivalence class* of a message $M$:

$$[M]_\pi = \{ M' \in \mathcal{M} : D_\pi(M, M') = 0 \}$$

This partitions the message space into classes that are indistinguishable from the perspective of action. The optimal encoding problem becomes: find the coarsest partition of $\mathcal{X}$ whose image under $\pi$ preserves the reference action. The minimal action-sufficient statistic is the maximally compressed representation that leaves behavior unchanged.

## 4. Three Implications

### Compression Ratio Is Decoder-Relative

In classical information theory, the compression limit for a source is its entropy $H(X)$, a property of the source alone. In action-conditioned compression, the effective compression limit depends on $\pi$.

Consider "simulate Lorenz" sent to three decoders:

- **A copyist** (identity decoder): the message must contain the full simulation code. Rate $\approx H(X_{\text{code}})$.
- **A 2020-era code model**: the message must specify equations, numerical method, and parameters. Rate $\approx H(X_{\text{spec}})$.
- **A 2026-era LLM**: the two-word prompt suffices. Rate $\approx H(\text{``simulate Lorenz''})$.

The source "information" did not change. What changed is how much of the behavioral specification can be offloaded to the decoder's internal state $S$. This makes the decoder's training data, world knowledge, and reasoning ability part of the communication channel's capacity.

### LLMs as Action-Oriented Decompressors

Recent work has shown that language models are general-purpose compressors. I sharpen this: LLMs are not merely compressors of *text*; they are decompressors of *intent into action*.

A prompt is a lossy, noisy, often incoherent compression of the user's intention. The model's task is not to reconstruct the "original message" (which may never have existed as a well-formed string) but to produce behavior---code, analysis, explanation---that satisfies the intention. This is decompression in the action-conditioned sense: the distortion is measured not by edit distance from some reference string but by whether the resulting behavior achieves what was intended.

This reframes prompt engineering: the goal is not to "communicate clearly" in the Shannon sense but to provide the minimal signal that steers the decoder's action distribution toward the desired behavioral region. **Ambiguity is not noise---it is delegation to the decoder's intelligence.**

### The Grounding Circularity

Action-conditioned distortion requires evaluating whether two actions are "the same." But evaluating action equivalence is itself an information-processing task: an observer must perceive the outcomes, compress them into a representation, and compare. This means:

1. Information is grounded by the actions it produces.
2. Actions are evaluated by the information (compressed observations) they generate.
3. That information is itself grounded by further actions.

This circularity is not a defect; it is the structure of intelligence. There is no external, fixed ground truth against which to measure distortion---only the ongoing loop of compression, action, perception, and recompression. The consequence for information theory is that **the distortion measure $d_\mathcal{A}$ cannot be specified independently of the agent**. It is itself a learned, compressed representation of what counts as "the same behavior."

## 5. Connections to Existing Work

**Rate-distortion theory** (Shannon, 1959): Our framework generalizes the classical theory by replacing symbol-space distortion with action-space distortion. When the decoder policy is the identity, the classical theory is recovered.

**Information bottleneck** (Tishby et al., 1999): The bottleneck compresses while preserving information about a relevance variable. In our framework, the relevance variable is the action itself, and preservation means behavioral equivalence rather than mutual information.

**Empowerment** (Klyubin, Polani & Nehaniv, 2005): Empowerment measures how much an agent *can* influence its environment via channel capacity between actions and perceptions. Our framework is complementary: we measure how much compression a message can tolerate before the influence it exerts degrades.

**Active inference** (Friston, 2010; Parr et al., 2022): The free energy principle holds that agents minimize variational free energy through both perception and action. Our framework shares the commitment to action-perception coupling but approaches it from the information theory side: we ask what the right distortion measure is, rather than what the right variational objective is.

**Semantic information** (Bar-Hillel & Carnap, 1953; Dretske, 1981; Floridi, 2004): These theories argue that Shannon information is semantically blind. Our proposal is complementary but more operational: meaning is not determined by what a message *indicates* but by what it *causes* an intelligent decoder to *do*.

**World models** (Ha & Schmidhuber, 2018; Hafner et al., 2020): These demonstrate empirically that learned representations need only preserve action-relevant information. Our framework provides the information-theoretic language for this observation.

**Coarse-graining** (Zwanzig, 1960; Mori, 1965; Jaynes, 1957): The Mori-Zwanzig projection formalism and Jaynes' maximum entropy principle are instances of action-conditioned compression: the "action" is prediction of macroscopic observables, and the distortion is measured by how well the coarse-grained description serves that predictive purpose.

**Thermodynamics of prediction** (Still et al., 2012): Thermodynamic dissipation equals the information retained about the past that is not predictive of the future. This provides a physical cost for retaining action-irrelevant information.

## 6. The Child-Parent Analogy

A child communicating with a parent illustrates the framework vividly. The child's "message"---a cry, a gesture, a garbled word---has low Shannon information and high ambiguity. But the parent, as an intelligent decoder with rich internal state (knowledge of the child's patterns, needs, context), decompresses this sparse signal into appropriate action: feeding, comforting, redirecting. The distortion is measured not by whether the parent "understood the words" but by whether the resulting behavior met the child's need.

This is precisely the structure of human-LLM interaction. The user's prompt is the child's cry; the model's internal state is the parent's accumulated understanding; the output is the action. And as the decoder grows more intelligent, the required compression of the message can increase without action-distortion---you can say less and get more.

## 7. Open Questions

1. **Formalizing $d_\mathcal{A}$**: How should we define action equivalence when actions have complex, long-horizon consequences?
2. **Empirical measurement**: Can we measure action-conditioned rate-distortion curves for real LLMs by systematically varying prompt compression and measuring behavioral divergence?
3. **Hierarchical action**: When actions themselves produce information that conditions further actions (the grounding circularity), what is the appropriate multi-level rate-distortion theory?
4. **Thermodynamic costs**: What is the physical energy cost of action-irrelevant information in biological and artificial neural networks?

## 8. Conclusion

Information theory needs a behavioral turn. The classical framework evaluates compression by symbol reconstruction; I propose evaluating it by action equivalence. This shift changes the rate-distortion function, makes compression limits decoder-dependent, and reveals the circular grounding structure of intelligence. As AI systems become the primary decoders of human-generated messages, the question "how many bits does this message contain?" must give way to "what does this message cause the decoder to do?"

## References

1. Shannon, C. E. (1948). A Mathematical Theory of Communication. *Bell System Technical Journal*, 27, 379-423.
2. Shannon, C. E. (1959). Coding Theorems for a Discrete Source with a Fidelity Criterion. *IRE National Convention Record*, 7, 142-163.
3. Tishby, N., Pereira, F. C., & Bialek, W. (1999). The Information Bottleneck Method. *Allerton Conference*.
4. Tishby, N. & Polani, D. (2011). Information Theory of Decisions and Actions. *Perception-Action Cycle*, Springer.
5. Kolmogorov, A. N. (1965). Three Approaches to the Quantitative Definition of Information. *Problemy Peredachi Informatsii*.
6. Solomonoff, R. J. (1964). A Formal Theory of Inductive Inference. *Information and Control*, 7, 1-22.
7. Jaynes, E. T. (1957). Information Theory and Statistical Mechanics. *Physical Review*, 106(4), 620-630.
8. Friston, K. (2010). The Free-Energy Principle: A Unified Brain Theory? *Nature Reviews Neuroscience*, 11(2), 127-138.
9. Friston, K., Kilner, J., & Harrison, L. (2006). A Free Energy Principle for the Brain. *J. Physiology-Paris*, 100, 70-87.
10. Parr, T., Pezzulo, G., & Friston, K. J. (2022). *Active Inference*. MIT Press.
11. Klyubin, A. S., Polani, D., & Nehaniv, C. L. (2005). Empowerment: A Universal Agent-Centric Measure of Control. *IEEE CEC*.
12. Rao, R. P. N. & Ballard, D. H. (1999). Predictive Coding in the Visual Cortex. *Nature Neuroscience*, 2(1), 79-87.
13. Bar-Hillel, Y. & Carnap, R. (1953). Semantic Information. *British J. Philosophy of Science*, 4(14), 147-157.
14. Dretske, F. I. (1981). *Knowledge and the Flow of Information*. MIT Press.
15. Floridi, L. (2004). Outline of a Theory of Strongly Semantic Information. *Minds and Machines*, 14(2), 197-221.
16. Deletang, G. et al. (2024). Language Modeling Is Compression. *ICLR*.
17. Ha, D. & Schmidhuber, J. (2018). Recurrent World Models Facilitate Policy Evolution. *NeurIPS*.
18. Hafner, D. et al. (2020). Dream to Control: Learning Behaviors by Latent Imagination. *ICLR*.
19. Dubois, Y. et al. (2021). Lossy Compression for Lossless Prediction. *NeurIPS*.
20. Zwanzig, R. (1960). Ensemble Method in the Theory of Irreversibility. *J. Chemical Physics*, 33(5), 1338-1341.
21. Mori, H. (1965). Transport, Collective Motion, and Brownian Motion. *Progress of Theoretical Physics*, 33(3), 423-455.
22. Still, S. et al. (2012). Thermodynamics of Prediction. *Physical Review Letters*, 109, 120604.
