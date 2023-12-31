---
layout: post
title:  "Morley's triangles"
date:   2023-12-31
categories: geometry typescript
---

A few days ago I recalled an old article I read many years ago about “Morley's triangles”. It is a geometrical property of triangles found by [Frank Morley](https://en.wikipedia.org/wiki/Frank_Morley) (1860–1937): if you trisect each of the three inner angles and intersect the lines, you will get an inner triangle that is *always equilateral*. You can find more information and proofs in the [Wikipedia page](https://en.wikipedia.org/wiki/Morley's_trisector_theorem) and on [MathWorld](https://mathworld.wolfram.com/MorleysTheorem.html). I remember that the article I read many years ago tried to explain why such a simple result was not discovered by Greek mathematicians, since a large part of Euclid's *Elements* covers their properties. The most likely reason is that ancient Greeks didn't like the idea of “trisecting” an angle, as it cannot be done with a ruler and a compass.

I would have loved to explain them to my children (the youngest has started studying Euclidean geometry in this school year!), but I looked for an interactive way to visualize them and found nothing close to what I wanted. I wanted just to show the *first* triangle (there are 18 of them!), and I wanted that the user could drag the vertexes of the triangle to explore how the inner triangle stays equilateral despite the deformations of the outer triangle.

I decided it would have been fun to implement this program in [TypeScript](https://www.typescriptlang.org/): it's been years I'm wanting to study it but have never found the occasion… before today. I bought the book “Mastering TypeScript” by Nathan Rozentals ([Packt publishing](https://www.packtpub.com/product/mastering-typescript/9781800564732)): in these days, it's just $10 instead of $32.99. I picked this book because of the very good reviews on [Amazon](https://www.amazon.com/Mastering-TypeScript-enterprise-ready-applications-frameworks/dp/1800564732), and I can tell you that they are well deserved. The book is wonderful: clear explanations, good examples, full of practical tips about the best workflow to write, run, and test your programs. I found it so clear that I was able to quickly implement a widget to interactively explore Morley's theorem.

Here is the result, you can drag any of the vertexes of the outer triangle and see how the inner triangle keeps being equilateral:

<canvas id="morley_canvas" width="560" height="560" style="border: 1px solid black;">
</canvas>
<script src="/js/morley.js"></script>

If you're curious, the TypeScript source code is available on [GitHub](https://github.com/ziotom78/ziotom78.github.io/blob/master/scripts/morley.ts).