# Quantifying Uncertainty with the PDF Method

## Introduction

Modern science recognizes that purely deterministic equations cannot fully explain physical phenomena. "We no longer believe that the physical world can be explained and predicted with purely deterministic equations, as Newton and Laplace did." Randomness pervades most measurable systems, requiring probabilistic approaches for accurate modeling.

Probability has become fundamental across disciplines, quantum mechanics, statistical mechanics, and statistical learning all emerged as paradigm shifts recognizing inherent uncertainty. Complex systems often behave chaotically even when appearing simple, as exemplified by the [double pendulum](https://en.wikipedia.org/wiki/Double_pendulum).

## Engineering Challenges with Uncertainty

Practical engineering applications face significant challenges: limited measurements, finite accuracy, and systems too large for precise measurement. "How would you predict the weather tomorrow based on what you see today? How would you predict the propagation of pressure waves in the Earth's crust around an earthquake?"

Rather than studying only average behavior, comprehensive uncertainty quantification improves system performance. The PDF method, popularized in turbulent flow and combustion modeling, addresses these challenges across differential equation systems.

## Problem Definition

The PDF method transforms deterministic problems into probabilistic equivalents. Given a differential equation:

$$\frac{\partial u}{\partial t} + \mathcal{L}_x^\mu u = 0$$

where $\mathcal{L}_x^\mu$ represents a differential operator and $\mu$ denotes physical parameters, uncertainty propagates through initial conditions (IC), boundary conditions (BC), or parameters via their probability density functions.

The transformation converts:

| Aspect | Deterministic | Probabilistic |
|--------|---------------|---------------|
| **PDE/ODE** | $\frac{\partial u(x, t)}{\partial t} = \mathcal{L}_x^\mu[u(x,t); \mu]$ | $\frac{\partial f_{u\mu}(U, M; x, t)}{\partial t} = \mathcal{M}_{xU}^\mu[f_{u\mu}(U, M; x, t)]$ |
| **B.C** | $u(x_b, t) = u_b(x_b, t)$ | $f_{u\mu}(U, M; x_b, t) = \hat{g}_{u\mu}(U, M; x_b, t)$ |
| **I.C** | $u(x, 0) = u_0(x)$ | $f_{u\mu}(U, M; x, 0) = \hat{h}_{u\mu}(U, M, x)$ |

## A Simple Example

Consider the ODE: $\frac{du}{dt} = ku$ with uncertain initial condition $u(0) = u_0$ having PDF $f_{u_0}(U)$.

The PDF method introduces the raw PDF:

$$\pi_u = \delta(u(t) - U)$$

where $\delta(\cdot)$ is the Dirac delta function and $U$ represents sample space variables. The ensemble average yields the PDF: $\langle \pi_u \rangle = f_u(U, t)$.

**Derivation steps:**

1. Multiply both sides by $\partial \pi_u / \partial u$
2. Apply chain rule and the property $\partial \pi_u/\partial u = -\partial\pi_u/\partial U$
3. Use delta function properties and ensemble averaging to obtain:

$$\frac{\partial f_u}{\partial t} + kU\frac{\partial f_u}{\partial U} + kf_u = 0$$

This linear hyperbolic equation yields the analytical solution:

$$f_u(U, t) = f_{u_0}(Ue^{-kt})e^{-kt}$$

For $k > 0$, the distribution compresses toward zero; for $k < 0$, it expands outward, behavior consistent with the deterministic solution $u_0 e^{-kt}$.

![Uncertainty propagation visualization](https://cdn.prod.website-files.com/6571b33671b6f69223ac5ed0/659bcafc0e31c608e6e0179c_image.png)

## Limitations and Future Directions

The PDF method requires two conditions: deriving a PDF equation and solving it, analytically or numerically. However, "there is a large class of differential equations (like a diffusion equation) for which the first step doesn't work." Only certain terms transform into PDF functions; others require problem-specific approximations.

Data-driven machine learning approaches offer promise. "In a recent paper, we propose a data-driven method to discover the PDF equation from a collection of single realizations (Monte Carlo simulations)." This emerging direction could revolutionize how uncertainty quantification and physics-informed modeling are conducted.
