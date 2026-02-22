# On Discovering Physics From Data

Scientific discovery has traditionally relied on human intuition, experimental observation, and mathematical reasoning. But what if machines could assist — or even automate — the process of finding the governing equations of physical systems?

## The Equation Discovery Problem

Consider a physical system whose state $\mathbf{x}(t) \in \mathbb{R}^n$ evolves according to unknown dynamics:

$$\frac{d\mathbf{x}}{dt} = \mathbf{f}(\mathbf{x})$$

Given measurement data $\{\mathbf{x}(t_1), \mathbf{x}(t_2), \ldots, \mathbf{x}(t_m)\}$, the goal is to discover the function $\mathbf{f}$ directly from data.

This is fundamentally different from standard machine learning: we don't just want a black-box predictor — we want the *equations themselves*, in human-interpretable form.

## Sparse Identification of Nonlinear Dynamics (SINDy)

The SINDy framework [1] addresses this by assuming that most physical systems are governed by equations with only a few active terms from a large library of candidate functions.

We construct a library matrix $\Theta(\mathbf{X})$ containing candidate terms (polynomials, trigonometric functions, etc.):

$$\Theta(\mathbf{X}) = \begin{bmatrix} 1 & \mathbf{X} & \mathbf{X}^2 & \cdots & \sin(\mathbf{X}) & \cdots \end{bmatrix}$$

and solve the sparse regression problem:

$$\dot{\mathbf{X}} = \Theta(\mathbf{X}) \boldsymbol{\Xi}$$

where $\boldsymbol{\Xi}$ is a sparse coefficient matrix. Sparsity is promoted through techniques like sequential thresholded least squares (STLS) or LASSO.

### Why Sparsity?

Most governing equations in physics have remarkably few terms. The Lorenz system, for example, has only 7 nonzero terms out of a potential library of 30+ candidates:

$$\dot{x} = \sigma(y - x)$$
$$\dot{y} = x(\rho - z) - y$$
$$\dot{z} = xy - \beta z$$

This sparsity is not coincidental — it reflects the fact that physical laws tend to be *parsimonious*. Nature favors simplicity, or at least, the effective descriptions we use do.

## From Full Observations to Partial Measurements

In practice, we rarely observe the full state $\mathbf{x}(t)$. We might measure a single variable, or observe through a nonlinear measurement function $\mathbf{y} = h(\mathbf{x})$.

This motivates the use of **delay embeddings** [2]. Takens' theorem tells us that for a generic observable $y(t)$, the delay-coordinate vector:

$$\mathbf{Y}(t) = [y(t), y(t-\tau), y(t-2\tau), \ldots, y(t-(d-1)\tau)]$$

is diffeomorphic to the original attractor when $d \geq 2n + 1$.

The challenge becomes: can we discover governing equations from these delay coordinates alone? Our work on **deep delay autoencoders** [3] shows that by combining delay embeddings with neural network autoencoders, we can simultaneously learn:

1. A coordinate transformation from delay space to a low-dimensional latent space
2. The governing equations in that latent space

## The Role of Dimensional Analysis

Physical laws are not arbitrary mathematical functions — they respect the units and dimensions of the quantities involved. Our work on **dimensionally consistent learning** [4] shows that incorporating physical units into the learning process:

- Dramatically reduces the search space
- Improves generalization beyond the training data
- Automatically discovers relevant dimensionless groups (the Buckingham Pi theorem)

For example, given data on pendulum dynamics with variables $(L, g, m, \theta, \omega)$, a dimensionally consistent learner will automatically identify that the relevant dynamics depend on $g/L$ rather than $g$ and $L$ independently.

## Open Questions

Several fundamental questions remain:

1. **Identifiability**: When can we uniquely recover the true equations from finite, noisy data?
2. **Coarse-graining**: How do we discover equations at the "right" scale when multiscale physics are at play?
3. **Partial knowledge**: How should we incorporate known physics (conservation laws, symmetries) as constraints?
4. **Causality**: Discovered equations capture correlations, but are they truly *causal*?

## References

1. Brunton, S. L., Proctor, J. L., & Kutz, J. N. (2016). Discovering governing equations from data by sparse identification of nonlinear dynamical systems. *PNAS*, 113(15), 3932-3937.
2. Takens, F. (1981). Detecting strange attractors in turbulence. *Lecture Notes in Mathematics*, 898, 366-381.
3. Bakarji, J., Champion, K., Kutz, J. N., & Brunton, S. L. (2023). Discovering governing equations from partial measurements with deep delay autoencoders. *Proceedings of the Royal Society A*, 479(2276).
4. Bakarji, J., Callaham, J., Brunton, S. L., & Kutz, J. N. (2022). Dimensionally consistent learning with Buckingham Pi. *Nature Computational Science*, 2, 834-844.
