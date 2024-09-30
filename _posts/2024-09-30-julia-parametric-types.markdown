---
layout: post
title:  "A tutorial about parametric constructors in Julia (1/2)"
date:   2024-09-30
categories: julia
katex: True
---

* Do not remove this line (it will not be displayed)
{:toc}

Julia enables the definition of *parametric types*, similar to class templates in C++.
They let the user define a “template” for a `struct` where the types are only defined in general terms, and the user will “fill” the definitions once they create an actual object.
To build a `struct`, one can implement *constructors*, which are special functions whose name is the same as the `struct` (again, similar to C++) and whose purpose is to set up the object so that its state is consistent.

Constructors for parametric types can be complex.
Still, it is crucial to understand how they work, as they make the code more robust (you can spot conceptual errors earlier) and more performant (the code runs faster).

I wrote this long blog post to put together some facts that I have discovered about this topic.
I often find myself re-reading the chapters in the Julia Manual about [types](https://docs.julialang.org/en/v1/manual/types/) and [methods](https://docs.julialang.org/en/v1/manual/methods/), trying to figure out why the way I defined a constructor is not working or doing what I was expecting.
I will stick to facts as much as possible, providing as many practical examples as needed, but please remember that I am not an expert in this field, and some of my explanations may be incorrect.
Send me an email if you think something is wrong or missing.

Because of the length of the text, I am going to split this post in two:

1. In the first part (this one), I will describe what parametric types are;

2. In the second part, we will see how to define constructors for parametric types.


# A short introduction to parametric types

Julia permits the definition of composite types using the keyword `struct`, as in the following example:

```julia
struct Point
  x
  y
end
```

This defines a type `Point` that contains two fields: `x` and `y`.
Thus, `Point` can represent a 2D point on the Cartesian plane.
If one wants to define the same in C++, one could come out with the following definition:

```c++
struct Point {
    double x;
    double y;
};
```

A notable difference between Julia and C++ is that the latter forced us to declare a type (`double`) for `x` and `y`, while Julia was happy without it. The definition of `Point` in Julia lets both fields to be of any type, even strings:

```julia
julia> Point(1, 2)
Point(1, 2)

julia> Point(3.2, 5.1)
Point(3.2, 5.1)

julia> Point("hello", "world")
Point("hello", "world")
```

Letting a `Point` components be strings is a bit silly! Inspired by the definition of `Point` in C++, we might decide to restrict ourselves to only floating-point numbers:

```julia
struct Point
  x::Float64
  y::Float64
end
```

Much better!
This structure is now conceptually identical to the one in C++.

However, both the C++ and Julia definitions are too rigid.
For instance, both take 16 bytes (64 bits + 64 bits), but there might be situations where one prefers to use 32-bit floating points to save memory.
(This is typical when your code deals with many points and does not strive for high accuracy.)
We might thus want to let the user specify the width of `x` and `y` when they create a new `Point` object.
However, we do not want to give the user too much freedom and decide that both `x` and `y' should be of the same type: both must be integers, floating-point numbers, etc.

In C++, we can achieve this by using *class templates*:

```c++
template <typename T>
struct Point {
  Point(T ax, T ay) : x{ax}, y{ay} {}

  // `x` and `y` must be of the same type `T`!
  T x, y;
};

Point pt1{1.0, 2.0};    // 64-bit floating points
Point pt2{3.0f, 4.0f};  // 32-bit floating points

// This does not compile:
//   Point pt3{5.0, 6.0f};  // Error, we're mixing 64-bit and 32-bit types!
```

This implementation satisfies both requirements: (1) when creating a new `Point` object, we can specify the width of the type, and (2) regardless of the choice for `T`, `x` and `y` must be of the same type.

Julia implements *parametric types*, which are similar to templates in C++; our structure becomes the following:

```julia
struct Point{T}
    x::T
    y::T
end

pt1 = Point(1.0, 2.0)      # 64-bit floating points
pt2 = Point(3.0f0, 4.0f0)  # 32-bit floating points

# This does not compile:
#   pt3 = Point(5.0, 6.0f0)
```

This definition of `Point{T}` shares the same properties with the C++ implementation of `Point<T>`: freedom to use different types and consistency between `x` and `y`.


# Hierarchies of parametric types

In the previous section, we saw that C++ class templates and Julia parametric types enable the creation of a type `Point{T}` that “decides” which type to use for some or all of its fields only at the time of instantiation.

A difference between C++ class templates and Julia parametric types is that Julia creates a type hierarchy for any parametric type: once we define `Point{T}` (parametric type), we enable the definition of several concrete types like `Point{Float64}`, `Point{Int}`, `Point{String}`, etc., and each of them <del>derive from an ancestor type</del> are subtypes of a union type `Point`:

```julia
julia> Point{Int} <: Point
true

julia> Point{Float64} <: Point
true
```

The advantage of having `Point` is that now we can write functions that apply to any type of the form `Point{T}`, regardless of the actual `T`.
It is enough to specialize a parameter over the ancestor `Point` instead of a particular parametric type like `Point{Float64}`, like in this example:

```julia
f(x::Point{Float64}) = "Got a point with 64-bit coordinates: $x"
f(x::Point) = "Got a point: $x"
f(x) = "Got something else: $x"

println(f(Point(1.0, 2.0)))
println(f(Point(1, 2)))
println(f(3))

# Output:
#   Got a point with 64-bit coordinates: Point{Float64}(1.0, 2.0)
#   Got a point: Point{Int64}(1, 2)
#   Got something else: 3
```

Type `Point` is an alias for `Point{T} where T`, i.e., it is an union of all the specializations of `Point`:

```julia
julia> typeof(Point)
UnionAll
```

Therefore, the definition

```julia
f(x::Point) = "Got a point: $x"
```

is equivalent to the following:

```julia
f(x::Point{T}) where T = "Got a point: $x"
```

but it’s shorter to write and thus clearer.


# Preventing parametric types from being too generic

When we first defined `Point` with no type specification for `x` and `y`, we noticed it was too naive because it allowed the user to store strings into `x` and `y`.

This problem remains in the parametric type `Point{T}` (and in the C++ class template `Point<T>` too):

```julia
struct Point{T}
    x::T
    y::T
end

# Oh gosh, this doesn't look good at all!
pt_wrong = Point("this should", "not be allowed")
```

In C++, one could resort to [concepts](https://en.wikipedia.org/wiki/Concepts_(C%2B%2B)) (introduced in C++20) to constrain the type of the template parameter `T` to floating-point values:


```c++
#include <concepts>

// Note `std::floating_point` instead of `typename` here!
template <std::floating_point T>
struct Point {
  Point(T ax, T ay) : x{ax}, y{ay} {}
  T x, y;
};

// The following line does not compile:
//
//     Point<string> pt{"this is", "not allowed"};
```

In Julia, we can use the `<:` operator to constrain the supertype of `T`:

```julia
struct Point{T <: Real}
    x::T
    y::T
end

# The following line would not compile:
#
#     pt3 = Point("this is", "not allowed")
```

We can constrain types as a tool to document the purpose of the fields in the struct.
In this case, we are telling whoever wants to instantiate a `Point` that the purpose of the fields `x` and `y` is to store something that is conceptually a “number” and not a string.
Thus, `x` and `y` measure something quantitatively and are presumably supposed to be used in mathematical formulae.
Without them, anybody glancing at the code might think that one could assign a string, a file, or a socket to them! (I'm exaggerating for clarity's sake 😀.)


# Is it always worth to restrict the types?

Is restricting the types invariably worth it?
After all, there might be some ingenious uses in a `Point` type where we *do* want to store strings in the `x` and `y` components.
That we cannot think of any of them does not mean that there aren’t at all!

There is no general rule here.
However, there is an essential fact that you should keep in mind when facing this kind of doubt.
Parametric types can be **highly** efficient when the type `T` is *concrete* (i.e., not abstract). Have a look at this:

```julia
struct Generic
   x
   y
end

struct Parametric{T}
   x::T
   y::T
end

println("Generic: ", sizeof(Generic(Int8(1), Int8(2))), " bytes")
println("Parametric: ", sizeof(Parametric(Int8(1), Int8(2))), " bytes")
```

The output is surprising:

```
Generic: 16 bytes
Parametric: 2 bytes
```

If we do *not* provide a type for `x` or `y`, Julia assumes that it is of type `Any` and thus it “boxes” it into a container.
The result is that `x` and `y` are pointers pointing to the two boxes for `Generic`, while `Parametric{T}` keeps them close together. This picture illustrates the difference:

![](/assets/2024-09-30-julia-constructors1/memory-layouts.svg){:style="display:block; margin-left:auto; margin-right:auto"}

The advantage of boxes is that Julia is free to grow or shrink the space allocated for the *values* (i.e., `1` and `2` in the picture above), as this example shows:

```julia
# We want a mutable type because we're going to
# change `x`
mutable struct MyType
   x
   y
end

# We initialize the type with two 8-bit integers
pt = MyType(Int8(1), Int8(2))

# We now ask to use a 64-bit integer instead of the
# original 8-bit type, and Julia does not complain.
pt.x = Int64(1)
```

Julia fulfills our request to replace an 8-bit value with a 64-bit integer because `x` does *not* contain the value itself but rather a pointer to the “box” containing the 8-bit value.
When we reassign it to the 64-bit value `Int64(1)`, Julia throws away the old box, creates a large enough new one, and reassigns the pointer `x` to point to this new box.

One might wonder if boxing affects performance, too.
Let's check this: we will compute the sum of all the distances of a list of points from the center in the case of two lists, one using `Generic` and the other using `Parametric`.
Here is the benchmark code:

```julia
function f(list)
    cumsum = zero(typeof(list[begin].x))
    for l in list
        cumsum += sqrt(l.x^2 + l.y^2)
    end

    return cumsum
end

N = 100_000
generic_list = [Generic(rand(Float64), rand(Float64)) for i in 1:N]
parametric_list = [Parametric(rand(Float64), rand(Float64)) for i in 1:N]
```

And here are the results:

```
julia> @benchmark f(generic_list)
BenchmarkTools.Trial: 438 samples with 1 evaluation.
 Range (min … max):  10.457 ms … 147.525 ms  ┊ GC (min … max): 0.00% … 92.25%
 Time  (median):     11.048 ms               ┊ GC (median):    0.00%
 Time  (mean ± σ):   11.399 ms ±   6.529 ms  ┊ GC (mean ± σ):  3.37% ±  4.62%

       ▂▄▂▂ ▄▅▃▄▃▅  ▃▄▁▃▂ ▂█  ▁▁ ▂                              
  ▃▄▃▅▅███████████▆▇████████████▇█▆▅▆▆█▅▅▄▄▄▄▄▃▃▃▃▄▃▃▃▃▁▁▁▁▃▁▃ ▅
  10.5 ms         Histogram: frequency by time         12.2 ms <

 Memory estimate: 7.63 MiB, allocs estimate: 500000.

julia> @benchmark f(parametric_list)
BenchmarkTools.Trial: 10000 samples with 1 evaluation.
 Range (min … max):  438.580 μs … 669.432 μs  ┊ GC (min … max): 0.00% … 0.00%
 Time  (median):     439.923 μs               ┊ GC (median):    0.00%
 Time  (mean ± σ):   458.728 μs ±  30.981 μs  ┊ GC (mean ± σ):  0.00% ± 0.00%

  █  ▁▃▅  ▄▃▂▁▂▂▂▂▂▂▃▁▁ ▁▁ ▁▁                                   ▁
  ██▄███████████████████████████▇██▇▇▇▇▇▇▇▆▆▆▅▆▆▅▅▅▅▆▄▄▃▅▆▆▃▆▄▅ █
  439 μs        Histogram: log(frequency) by time        586 μs <

 Memory estimate: 16 bytes, allocs estimate: 1.
```

On my laptop, the version with `Parametric` is roughly 20 times faster and allocates far less memory.
The fact that the `x` and `y` components in `generic_list` are scattered across the memory does not help the CPU cache optimize subsequent memory fetches in the `for` loop, partly explaining the poorer performance.
But what about the many allocations?
A call to `@code_warntype f(generic_list)` reveals that the culprit is probably the line where `cumsum` is incremented.
Julia cannot know the actual type of `l.x` and `l.y` in the function call `sqrt(l.x^2 + l.y^2)`, so it has to retrieve the value of `x` and `y`, check for their type, and be sure that the result fits into `cumsum`, which is of type `Float64`.
I am not 100% sure why Julia needs to allocate some memory here.
The compiler probably needs memory for some intermediate result related to the calculation involving `l.x` and `l.y`.
All this work is unnecessary with a list of `Parametric` objects, as the width of `x` and `y` is known when Julia compiles the function.

We have learned that parametric types are valuable when we need our code to be performant.
Note that boxing happens not only when you avoid specifying a type but also when you refer to an abstract type.
Thus, the following definition is no better than `Generic`, even if we specify that `x` and `y` should be real numbers:

```julia
struct MyType
   x::Real  # Specifying ::Real makes the typing more precise, yet
   y::Real  # boxing is still needed
end

println("MyType: ", sizeof(MyType(Int8(1), Int8(2))), " bytes")
# Output:
#   MyType: 16 bytes
```

The reason is easy to understand: several types derive from `Real` (`Float32`, `Float64`, `BigFloat`, etc.) and have different sizes. Since Julia does not know the space needed in advance, it is forced to box both `x` and `y`.

Tip: you can quickly check if a type is concrete or abstract using `isconcretetype()` and `isabstracttype()`:

```julia
julia> isconcretetype(Real)
false

julia> isabstracttype(Real)
true

julia> isconcretetype(Int8)
true

julia> isabstracttype(Int8)
false
```

This concludes the first part of the post. In a few days I will publish the second part, where I will discuss parametric constructors.


# Edits

I reworked Section “[Hierarchies of parametric types](http://127.0.0.1:4000/julia/2024/09/30/julia-parametric-types.html#hierarchies-of-parametric-types)” after a [comment by @jules](https://discourse.julialang.org/t/new-blog-post-about-julia-parametric-types-and-constructors/120717/2?u=maurizio_tomasi) on the [Julia Forum](https://discourse.julialang.org/).
