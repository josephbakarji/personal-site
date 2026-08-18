# On Discovering Physics From Data

## Introduction

> "The most incomprehensible thing about the world is that it is comprehensible." — Albert Einstein

> "The miracle of the appropriateness of the language of mathematics for the formulation of the laws of physics is a wonderful gift which we neither understand nor deserve." — Edward Wigner

Our grasp of the world has evolved alongside our capacity to shape it. Language provided initial frameworks for abstract representation, but the Renaissance introduced a revolutionary concept: space and time could be quantified through mathematics to predict behavior with remarkable precision.

Galileo Galilei pioneered this approach by dropping objects from the Leaning Tower of Pisa to establish relationships between time and displacement. Isaac Newton formalized connections between force, mass, and acceleration. Empirical laws of the seventeenth and eighteenth centuries emerged from carefully designed experiments with controllable inputs linearly affecting outputs. As measurement devices and mathematical tools advanced, our understanding of existence evolved correspondingly.

The last century witnessed paradigm shifts from relativistic time to quantum matter. However, the most transformative change in scientific methodology resulted from computers.

## The Pre-Computational Era

Until the mid-1950s, scientists discovered mathematical rules animating the universe through paper-based work. Modeling relied heavily on developing analytical techniques to formalize and apply these rules for prediction. The limitations of manual methods, pens, papers, and imagination, created a strong bias toward simpler representations.

Without sophisticated computational tools, scientists favored well-posed linear equations with minimal variables. They conceptualized systems using simple building blocks (atoms, cells, agents) with straightforward input-output relationships. They preferred systems where superposition applied, avoiding models generating unpredictable dynamics from component interactions. These practical constraints enabled generalization beyond perceptual observation. However, significant limitations emerged: these assumptions could not capture true complexity in living systems, ecosystems, self-organizing phenomena, turbulent flows, and essentially all universal phenomena.

## The Computational Revolution

With faster, widely available computers, scientists could solve complicated nonlinear systems previously unimaginable. Numerical "experiments" enabled studying complex, nonlinear, high-dimensional, multiscale, and multiphysical systems. Linear model bias could be partially relaxed.

Investigating complex physical systems transformed into an iterative cycle: deriving equations, designing numerical solvers, simulating systems, analyzing predictions, and modifying models until observations matched predictions. Automating forward predictions became possible with well-posed models, typically derived manually from first principles. However, this manual optimization process could itself benefit from computational automation.

Over two decades, floating-point operation speeds increased exponentially via Moore's Law, available data exploded through the internet, and optimization algorithms, particularly for neural networks, became powerful enough to surpass human performance on complex tasks. Could complex system modeling finally be automated?

## Physics-Informed Machine Learning

Scientists employ extensive modeling technique toolboxes accumulated over centuries, ranging from descriptive approaches (matter composed of indivisible particles) to quantitative methods (particles possessing velocities, positions, and following Newton's laws). Differential equations persist due to proven effectiveness and versatility. Most techniques extend existing ones to address problems where traditional approaches fail.

Different methods gain prominence based on their utility for problems researchers prioritize. Data-driven inverse modeling introduces new techniques replacing or complementing traditional tools.

Algorithmic approaches to discovering scientific models from data have existed for decades. Neural networks, proposed by McCulloch and Pitts in 1943, drove recent artificial intelligence advances. Only recently did computers become efficient enough for handling data volumes and computational requirements making these methods practical for real-world problems.

Pat Langley and colleagues proposed discovering scientific laws from data in the 1980s, summarized in *Scientific Discovery: Computational Explorations of the Creative Processes*. Lagaris and others proposed solving differential equations with neural networks in 1998. Recent computational and algorithmic resources from major technology companies revived these approaches.

Large language models like ChatGPT and Google's Bard demonstrate that solving complex problems traditionally requiring human brains will become cheaper and more accessible. Science cannot remain immune to this transformation.

However, popular deep learning techniques excelling at language generation, image creation, and recommendations do not necessarily meet standards for physical system modeling requiring higher prediction accuracy. Scientific discovery emphasizes extrapolation, which modern deep learning does not guarantee.

## Why I'm Interested

I approached this research field through fundamental scientific questions: *how does the world work?*

Initially, fascination centered on understanding relationships between scales, how larger structures emerge from smaller components. Specifically, I wanted understanding how atoms self-assemble into cells and cells into human beings. I believed rigorous first-principles approaches from hard sciences would provide answers or necessary tools. While not entirely incorrect, I discovered those tools were more limited than anticipated. Modeling complex systems from first principles can only proceed so far.

Data-driven modeling enters here. Combining modern machine learning techniques with widely available data shows promise for discovering rules animating multiscale complex systems. Whether this promise materializes depends on research developments over the coming decade. Certainly, twenty-second-century scientific research will differ substantially from twentieth-century science through vastly increased computational resource involvement.

My motivating questions still involve understanding *how the world works*, but have gradually transformed into questions about intelligences, both machine and human, doing the understanding. I increasingly contemplate how *understanding how the world works* itself functions. Previously purely philosophical, this has recently become an engineering and scientific question.

Practically, I have worked on fundamental methods powering data-driven discovery of scientific laws:

- Multiscale modeling
- Equation discovery from partial measurements
- Non-dimensionalization from data

## Data-Driven Coarse Graining

The universe's most fascinating aspect involves scale. While nothing inherently special about large things comprising smaller things, it becomes interesting realizing their behavior can differ dramatically.

Many discovered rules apply across phenomena within the same scale, but this generalization frequently fails across different scales. Newton's laws perform excellently at spatial and temporal scales similar to ours but fail at atomic levels, where quantum mechanics applies.

Additionally, bridging-scale rules are not trivial. Currently, one of the most challenging scientific questions involves understanding how large complex behaviors emerge from simple building blocks. Often, discovering governing laws within different scales proves easier than deducing one scale from another.

A common theme exists in how scales relate: when smaller components are uniform, larger entities can be studied statistically. Nineteenth-century thermodynamics and statistical mechanics first discovered this. In simple cases like ideal gases, deriving large-scale equations for probability distributions of small-scale interacting particles becomes possible. Boltzmann's equation represents one of the earliest such examples.

However, Boltzmann's analytical techniques yield closed-form equations only in simple cases with limited, well-known correlations in smaller-particle fields. Typically, deriving probabilistic density function equations requires numerous approximations for closure, called closure modeling, frequently arising in computational fluid dynamics where efficient solvers require statistical turbulent-fluctuation modeling.

![PDF Equation Discovery](https://cdn.prod.website-files.com/6571b33671b6f69223ac5ed0/659c071b34f8cfe532c9cc3f_pdf-eqn-light.png)

We address discovering PDF equations and their closure approximations from data within uncertainty-quantification contexts.

Given field measurements $u(x, t)$, perhaps pollutant concentration or dye in fluid where $x$ represents measurement location and $t$ time, the field is random due to uncertainty about initial conditions or parameters $u$ depends on. Thus $u$ has an associated probability density function $f_u(U; x, t)$ where $U$ represents the sample-space variable, a deterministic value the random variable $u(x, t)$ can assume. We assume equations governing $u(x, t)$ follow:

$$\dot{u} = \mathcal{L}_\mu u$$

where $\mathcal{L}$ represents a differential operator (like $\partial / \partial x + \partial^2 / \partial x^2$ in 1D), and $\mu$ represents input parameters.

With determinism, one solves equations without probability concerns. Given uncertainties, say initial-condition uncertainties given by $f_u^0 = f_u(x, t=0)$, we want predicting how that distribution evolves temporally according to:

$$\frac{\partial f_u}{\partial t} = \mathcal{K}_\nu f_u$$

where $\mathcal{K}_\nu$ represents a differential operator typically appearing in advection-diffusion form (Fokker-Planck equations). The question becomes: how can we find $\mathcal{K}_\nu$ from $\mathcal{L}_\mu$?

Analytical techniques like PDF methods used in turbulence exist, but frequently encounter closure problems. Our approach uses the sparse identification of differential equations method (sparse identification of nonlinear dynamics, or SINDy) for finding $\mathcal{K}_\nu$ from Monte Carlo simulation data.

Results prove promising, capable of discovering complete PDF equations and approximating closure terms when parts can be analytically derived. Our proposed method found exciting applications in active matter (schooling fish), neuroscience, uncertainty quantification, and beyond.

## Discovering Hidden Variables and their Associated Dynamics

Recent physics-informed machine learning work focused primarily on two areas: discovering models from data and accelerating numerical solvers. However, physics's most fundamental questions start from identifying variables required for useful predictions. Early scientific modeling's considerable effort involved identifying relevant variables fitting within generalizing laws.

Finding low-dimensional latent variables in high-dimensional measurements relates to previously discussed coarse-graining and reduced-order modeling traditions in engineering where high-dimensional measurement correlations are distilled for system dynamics.

Neural network popularity opened possibilities using autoencoder architectures performing nonlinear dimensionality reduction for finding latent variables best representing underlying dynamics. Given latent-variable non-uniqueness depending on architecture and data, current research concentrates on constraining the hypothesis class (via loss functions) for obtaining physically meaningful latent variables.

![Delay Embedding SINDy](https://cdn.prod.website-files.com/6571b33671b6f69223ac5ed0/659c074154131d3705a61938_delay-sindy-compact-pnas.jpg)

Our latest work addresses central challenges modeling systems with only partial measurements available. Suppose interested in modeling a three-dimensional system but only possessing single-dimension measurements: could recovering three-dimensional equation systems be possible?

This sounds nearly impossible (given its ill-posedness), but Takens' theorem provides conditions for when augmenting partial measurements with time-delayed information yields an attractor diffeomorphic to the original full-state system's attractor.

However, the coordinate transformation back to the original attractor remains typically unknown, and learning embedding-space dynamics remained an open challenge for decades. Our paper designs a custom deep autoencoder network learning coordinate transformations from delayed embedded space into spaces enabling sparse, closed-form dynamics representation. We demonstrate simultaneously finding hidden variables alongside the associated coordinate system for partially observed dynamics.

While initial results show promise, substantial work remains making latent-dynamics-discovery algorithms computationally efficient and noise-robust. Main challenges involve hyperparameter-space dimensionality from numerous weighted loss-function terms.

We actively work on algorithmic improvements and real-world measurement applications, aiming toward making latent-variable discoveries capable of solving modeling problems across all science and engineering fields.

## Discovering Dimensionless Groups

Without governing equations, physicists have traditionally relied on dimensional analysis for extracting insights and finding symmetries in physical systems.

Dimensional analysis rests on the principle that physical laws do not depend on measurement units. Consequently, functions expressing physical laws possess generalized homogeneity and do not depend on observers.

Though dimensional-analysis concepts date to Newton and Galileo's times, Edgar Buckingham formalized them mathematically in 1914. Buckingham proposed a principled method extracting most general physical-equation forms through simple dimensional considerations of seven fundamental measurement units: length (metre), mass (kilogram), time (seconds), electric current (ampere), temperature (kelvin), substance amount (mole), and luminous intensity (candela).

From electromagnetism to gravitation, measurements directly relate to these seven fundamental units. For example, force measures in Newtons, which is $kg \cdot m \cdot s^{-2}$, and electric charge measures in Volts, which is $kg \cdot m^2 s^{-3} A^{-1}$. The resulting Buckingham Pi theorem was originally contextualized through physically similar systems or parameter groups relating similar physics.

Given knowledge of variables and parameters alone, the Buckingham Pi theorem provides procedures for finding dimensionless-group sets spanning solution spaces, though such sets are not unique.

![Buckingham Pi Approaches](https://cdn.prod.website-files.com/6571b33671b6f69223ac5ed0/659c079a9f9332773040b4b9_buckingham-pi-approaches.jpeg)

In recent work, we propose an automated approach using available measurement data's symmetric and self-similar structures for discovering dimensionless groups best collapsing data to lower-dimensional spaces through optimal fitting. We developed three data-driven techniques using the Buckingham Pi theorem as constraints: (1) a constrained optimization problem with a non-parametric input-output fitting function, (2) a deep learning algorithm (BuckiNet) projecting input parameter space to lower dimensions in the first layer, and (3) a technique based on sparse identification of nonlinear dynamics discovering dimensionless equations whose coefficients parameterize dynamics.

We currently apply these techniques to problems where dimensionless groups remain unknown or partially known in simpler cases, such as non-Newtonian flows and granular materials.

## On Intelligence

Much of this work stems from larger questions about how our physical-world understanding functions, what portions we can automate for assisting in discovering more fundamental questions.

The most profound realization I've had recently involves recognizing that world-animating rules cannot separate from the means discovering them. Changing discovery methods will change rules and their properties non-trivially. In other words, understanding processes and their presumed assumptions form integral parts of the sought understanding.

This challenges our objectivity dogma, finding world representations independent from observers. If conceived reality heavily depends on discovery means (including thinking patterns), discussing independent "reality" becomes nearly meaningless. Furthermore, if poorly understood intelligence accesses reality, how can we agree on unified objective truth independent from ourselves?

Machine intelligence differs significantly from human intelligence in many respects; yet one cannot deny its superhuman information-processing and prediction capabilities. Do we claim machines are not intelligent simply because they do not match traditional definitions, or do we readjust reality views according to that intelligence?

The perspective that reality is not objectively accessible independently from observers is not new. My favorite perspective stems from enactivism: the view that reality emerges through organism-environment interactions. Both reality and the accessing self are so deeply intertwined that isolating either, as we are deeply programmed to do, fully captures neither what we are nor what the world is.

This philosophical question becomes more relevant as we increasingly automate intelligence finding motion rules rather than operating purely intuitively. Questions about rule fundamentality, how much they represent predictable reality, and generalization expectations become engineering rather than philosophical matters.

My work attempts addressing these questions from application and theoretical perspectives while constantly wrestling with arising ethical issues. I am excited about how the next decade will transform scientific methodology; and I am excited contributing to that revolution.
