---
layout: post
title: Making Sense of Polarization with Ludwig’s Third Convention
date: 2025-07-17
categories: electromagnetics
katex: True
---

# The problem with spherical coordinates

In antenna analysis, you often find that the electromagnetic field radiated by an antenna is expressed using a spherical reference system, where the antenna lies at the centre. The usual approach here is to decompose $\vec E$ and $\vec H$ using the standard spherical basis vectors given by
{% katex display %}
\hat e_r = \begin{pmatrix}
\sin\theta\,\cos\phi\\
\sin\theta\,\sin\phi\\
\cos\theta
\end{pmatrix},
\hat e_\theta = \begin{pmatrix}
\cos\theta\,\cos\phi\\
\cos\theta\,\sin\phi\\
-\sin\theta
\end{pmatrix},
\hat e_\phi = \begin{pmatrix}
-\sin\phi\\
\cos\phi\\
0
\end{pmatrix}.
{% endkatex %}

These vectors form a local orthonormal frame ($\hat e_r \perp \hat e_\theta \perp \hat e_\phi$) with the following properties:

1. $\hat e_r$ is always aligned towards the direction represented by the colatitude $\theta$ and the longitude $\phi$.
2. $\hat e_\theta$ points in the direction of increasing $\theta$ (southward), so that $\theta = 0$ is the North Pole, $\theta = 90^\circ$ is the Equator, and $\theta = 180^\circ$ is the South Pole.
3. $\hat e_\phi$ points in the direction of increasing $\phi$ (eastward), so that $\phi = 0$ points along the $x$ axis, $\phi = 90^\circ$ points towards the $y$ axis, and so on.

One drawback of this representation is that the directions of $\hat e_\theta$ and $\hat e_\phi$ change rapidly near the poles, making polarization analysis less intuitive in those regions. Moreover, they may not be aligned with the physical polarization direction of the antenna.

# Ludwig’s third convention

To overcome these problems people often use [Ludwig’s third convention](https://ieeexplore.ieee.org/document/1140406), which defines a “co-polar” axis and a “cross-polar” axis. These terms relate to how an antenna transmits a polarized signal. Ideally, the polarization is preserved in transmission (co-polar), but in practice, some unwanted radiation leaks into the perpendicular direction (cross-polar). Cross-polarization should ideally be zero, so antenna designs aim to minimize it. Ludwig’s convention helps to properly disentangle these two contributions, thus easing the job.

I often use this convention, and frequently feel the need to have a visual tool that shows how it works. To help visualize this convention, I developed a JavaScript tool that lets you explore how the co- and cross-polarization axes behave.

The plain definition from Ludwig’s paper is the following: in the far field, Ludwig proposed to decompose the electromagnetic field $$\vec E$$ into two perpendicular directions called $$E_\text{co} \hat e_\text{co}$$ (co-polar) and $$E_\text{cx} \hat e_\text{cx}$$ (cross-polar), where the two basis vectors $\hat e_\text{co}$ and $\hat e_\text{cx}$ are defined in this way:
{% katex display %}
\hat e_\text{co} = \cos\phi \cdot \hat e_\theta - \sin\phi \cdot \hat e_\phi, \quad
\hat e_\text{cx} = \sin\phi \cdot \hat e_\theta + \cos\phi \cdot \hat e_\phi.
{% endkatex %}
It is clear from this formulation that they lie on the $\theta\phi$ plane and are thus orthogonal to $\hat e_r$.

In the context of antenna design, Ludwig’s definition is convenient when one wants to quantify the emission of some antenna. In this case, the antenna is placed at the origin, and the problem is to write down the electric field $\vec E$ in the far field, where $\vec E$ has no component along $\hat e_r$ ($\vec E \cdot \hat e_r = 0$). Thus, $\vec E$ can be written as a combination of $\hat e_\text{co}$ and $\hat e_\text{cx}$.

If we consider a direction $(\theta, \phi)$ around the antenna, the vector $\hat e_r$ represents the direction of propagation of the electromagnetic wave and is parallel to $\vec k$, while $\hat e_\text{co}$ and $\hat e_\text{cx}$ are perpendicular to it.


# Exploring Ludwig’s basis

To fully grasp the significance of Ludwig’s convention, I created an interactive visualization of this configuration, which appears below.

The thin black cylinder represents the so-called “boresight”, which is where a directional antenna emits most of its energy. The gray cylinder perpendicular to the boresight represents the direction of the electric vector $\vec E$ along the boresight (its polarization direction). The two sliders let you modify $\theta$ and $\phi$. Try changing $\theta$ and $\phi$ to see how the co- and cross-polar vectors rotate in space and remain orthogonal to the direction of propagation.

The first nice property of this decomposition is that, near the boresight (where $\theta \approx 0$), the co-polar axis aligns with the polarization axis by design. This makes interpretation of antenna measurements simpler: as one of the guiding criteria in antenna design is to minimize the amount of cross-polarization, a simple rule of thumb is to minimize $E_\text{cx}$ around the boresight. (Forcing it to be equal to zero *everywhere* however would be too strict! Far from the boresight it’s hard to tell to what extent $\hat e_\text{co}$ is aligned with the polarization direction, as you can easily verify using the widget below.)

Another feature is that the only pole where polarization is undefined is along the *nadir* (the direction opposed to the boresight), while the *zenith* (aligned with the boresight) is well-behaved.

{% raw %}
<style>
.slider-row {
  display: flex;
  align-items: center;
  gap: 0.5em;
  margin-bottom: 0.5em;
}

.slider-row label {
  min-width: 110px;
}

.value-display {
  display: inline-block;
  width: 3ch; /* enough space for 3 digits (e.g., "180") */
  text-align: right;
}
</style>

<div id="viewer" style="width: 100%; height: 100vh; position: relative;"></div>

<script type="module">
  import { initLudwigViewer } from '/js/ludwig.js';
  initLudwigViewer('viewer');
</script>
{% endraw %}

# Conclusions

Ludwig’s third convention offers a practical way for analyzing antenna polarization in the far field, as it prevents a singularity along the boresight direction and provides a natural way to think of “co-polar” and “cross-polar” directions. These are some of the reasons why it is widely used in antenna pattern measurements and satellite communications.

# Appendix

I found useful to rewrite $\hat e_\text{co}$ and $\hat e_\text{cx}$ in terms of the three vectors $\hat e_x$, $\hat e_y$, and $\hat e_z$, as I needed these formulae to implement the JavaScript widget above. Here are the full expressions for your convenience:

{% katex display %}
\hat e_\text{co} = \begin{pmatrix}
\cos\theta\cos^2\phi + \sin^2\phi\\
(\cos\theta - 1)\cos\phi\sin\phi\\
-\sin\theta\cos\phi
\end{pmatrix},
\hat e_\text{cx} = \begin{pmatrix}
(cos\theta - 1)\cos\phi\sin\phi\\
\cos^2\phi + \sin^2\phi\cos\theta\\
-\sin\theta\sin\phi
\end{pmatrix}.
{% endkatex %}
