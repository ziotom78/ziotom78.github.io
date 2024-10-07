---
layout: post
title:  "A tutorial about parametric constructors in Julia (2/2)"
date:   2024-10-07
categories: julia
katex: True
---

* Do not remove this line (it will not be displayed)
{:toc}

In the [previous blog post](/julia/2024/09/30/julia-parametric-types.html), I have presented parametric types in Julia.
In this second part, I will explain what are the ways to initialize them properly and list a few technicalities that can sometimes cause weird behaviors.

# Constructors for parametric types

In all the examples in the previous blog post, you might have noticed that we did not have to specify the type `T` when instantiating a `Point` type, neither in C++ nor Julia:

```julia
struct Point{T}
    x::T
    y::T
end

# We do not write `Point{Float64}(1.0, 2.0) here:
# Julia correctly infers that the type is `Point{Float64}`
pt1 = Point(1.0, 2.0)
```

This is similar to C++, which got [Class Template Argument Deduction (CTAD)](https://en.cppreference.com/w/cpp/language/class_template_argument_deduction) in C++17:

```c++
#include <iostream>

template <typename T>
struct Point {
  Point(T ax, T ay) : x{ax}, y{ay} {}

  T x, y;
};

int main() {
  // Since C++17, there is no need to write `Point<double>` here,
  // as the compiler is smart enough to deduce it
  Point pt{1.0, 2.0};

  std::cout << pt.x << ", " << pt.y << "\n";
}
```

It is important to stress that it is the responsibility of Julia’s *inner constructors* to deduce the parametric type.
Julia permits the programmer to override the default inner constructors provided by the language, but if we do so, Julia loses the ability to perform the deduction.
The point is that overriding inner constructors is very common, as it is the preferred method for performing additional safety checks on our type.
Thus, if we override an inner constructor, we must know how to “recover” parameter deduction in our implementation.

To better explain this issue, let’s consider some type less boring than `Point`.
We will implement a new type `Vehicle` that holds information about the mass and the number of wheels of a generic vehicle.
Here is a possible implementation:

```julia
struct Vehicle{M <: Real, N <: Integer}
    mass::M
    num_of_wheels::N
end
```

I used a parametric type so that we do not incur in the overhead associated with generic `Any` types.
(See the previous blog post.)
Moreover, I enforced the fact that `M` must be a floating-point type (`Real`), while `N` must be an integer by declaring two types in the parameters of the type.
The type works as expected:

```julia
julia> Vehicle(100.0, 4)
Vehicle{Float64, Int64}(100.0, 4)
```

However, this definition could be more robust, as it does not check that the mass and the number of wheels are valid.
Both should be nonzero positive numbers!
Inner constructors come to the rescue here.
You define a function with the same name as the type and place this definition *within* the `struct` itself.
Within the function, you call `new` when ready to build the new object.
The point is that your definition of the inner constructor will *replace Julia’s default one*.
In our case, we can re-implement `Vehicle` as follows:

```julia
struct Vehicle{M <: Real, N <: Integer}
    mass::M
    num_of_wheels::N

    function Vehicle{M, N}(m, n) where {M, N}
        (m > zero(m)) || error("Invalid negative mass $m")
        (n > zero(n)) || error("Invalid number of wheels $n")

        # Note that we do *not* call `new(…)`, but
        # `new{M, N}(…)`: there is no `new()` function within the
        # inner constructor of a parametric type, because you are
        # expected to pass the proper types!
        return new{M, N}(m, n)
    end
end
```

However, if we try to use this new type as we did before, we get a surprising result:

```julia
julia> Vehicle(100.0, 4)
ERROR: MethodError: no method matching Vehicle(::Float64, ::Int64)
Stacktrace:
 [1] top-level scope
   @ REPL[10]:2
```

The problem is that our inner constructor does not conform to the form `Vehicle(…)` but `Vehicle{M, N}`.
The fact that `Vehicle` is a *parametric* type means that `M` and `N` should be considered as actual *parameters*, and you already know that whenever you call a function, you must provide all the parameters!
Thus, we must explicitly provide `M` and `N`:

```julia
julia> Vehicle{Float64, Int64}(100.0, 4)
Vehicle{Float64, Int64}(100.0, 4)
```

Spelling out the types is boring, but it is easy to implement a constructor that is smart enough to deduce the types by itself:

```julia
struct Vehicle{M <: Real, N <: Integer}
    mass::M
    num_of_wheels::N

    # Here we no longer have `{M, N}`
    function Vehicle(m, n)
        (m > zero(m)) || error("Invalid negative mass $m")
        (n > zero(n)) || error("Invalid number of wheels $n")

        # Retrieve the types `M` and `N`, and pass them to `new{…}`
        M = typeof(m)
        N = typeof(n)
        return new{M, N}(m, n)
    end
end
```

With this constructor, everything works as expected again:

```julia
julia> Vehicle(100.0, 4)
Vehicle{Float64, Int64}(100.0, 4)
```

You might fear that this new constructor might not prevent whoever is going to create a new `Vehicle` object from doing something silly.
Shouldn't we add something like `(N <: Integer) || error("N is of the wrong type")` in the constructor, to be sure that the user does not use a floating-point number for the number of wheels?

Fortunately, there is no need to do so:

```julia
julia> Vehicle(100, 4.1)
ERROR: TypeError: in Vehicle, in N, expected N<:Integer, got Type{Float64}
Stacktrace:
 [1] Vehicle(m::Int64, n::Float64)
   @ Main ./REPL[1]:12
 [2] top-level scope
   @ REPL[3]:1
```

The line `./REPL[1]:12` indicates that the error was originated in the statement `new{M, N}(m, n)`: `new` checked the consistency of the types for us, and our implementation of the constructor is solid.


# Correspondence between parametric types in the `struct` and in the constructor

We saw above that we can reproduce the behavior of Julia's default inner constructors and make the type specification `{M, N}` in the constructor call optional.
There might be situations where it is better to let the user specify a parametric type in the inner constructor than to let Julia deduce it.

For instance, consider the case where you have a structure `Particle` containing the kinetic and potential energy of a particle in the local gravitational field, but the constructor only requires its mass and velocity:

```julia
const g = 9.81

struct Particle{E <: Real}
  kinetic_energy::E
  potential_energy::E

  function Particle{E}(mass, velocity, height) where {E}
    kinetic_energy = 1/2 * mass * velocity^2
    potential_energy = mass * g * height

    return new{E}(kinetic_energy, potential_energy)
  end
end
```

In this case, the parameters we pass to the constructor are not the same that are going to be stored in the object itself, and thus it might make sense to force the user to spell out the type to use:

```julia
julia> p = Particle{Float32}(1.0, 3.0, 2.0)
Particle{Float32}(4.5f0, 19.62f0)
```

We explicitly asked Julia to store the two energies in `p` as `Float32`, regardless of the fact that the input type of all the three parameters was `Float64`.

For inner constructors, the type parameter `{E}` needs to be the same as the parametric type of the structure.
This might sound obvious, but there can be cases where one might want to make the constructor able to deal with a wider set of input types.

Assume, for instance, that you want to make `Particle` compatible with some code that expresses masses, velocities, and heights as complex numbers.
(There are plenty of mathematical artifices in the literature to solve complicated physical problems analytically, often involving complex numbers used weirdly.)
You know that you need to take the absolute values of the mass, velocity, and height to make `Particle` compute the kinetic and potential energies correctly.

We might think that specifying the base type for `Particle` as `C <: Complex` and using `abs` where appropriate should be enough.
This will make the code behave the same as usual with real numbers and make `Particle` work with the code based on complex numbers, too.
However, we cannot specify that the constructor accepts a type `C <: Complex`, as this implementation is *not* correct:

```julia
const g = 9.81

struct Particle{E <: Real}
  kinetic_energy::E
  potential_energy::E

  function Particle{C}(mass::C, velocity::C, height::C) where {C <: Complex}
    kinetic_energy = 1/2 * abs(mass) * abs(velocity)^2
    potential_energy = abs(mass) * g * abs(height)

    E = typeof(kinetic_energy)
    return new{E}(kinetic_energy, potential_energy)
  end
end
```

This code compiles, but calling the constructor with complex parameters does not work:

```julia
julia> Particle{ComplexF64}(1.0 + 5.0im, 3.0 + 4.0im, 2.0 + 1.0im)
ERROR: TypeError: in Particle, in E, expected E<:Real, got Type{ComplexF64}
Stacktrace:
 [1] top-level scope
   @ REPL[3]:1
```

Moreover, we lose the ability to use the constructor with proper parameters, because once we define an inner constructor, *Julia stops providing its default one*:

```julia
julia> Particle{Float64}(1.0, 3.0, 2.0)
ERROR: MethodError: no method matching Particle{Float64}(::Float64, ::Float64, ::Float64)
Stacktrace:
 [1] top-level scope
   @ REPL[4]:1
```

The problem is that “the signature of the constructor cannot widen the type's parameters”, as explained in [this post](https://discourse.julialang.org/t/constructors-for-parametric-types/119971/4) by **@Benny**.

There are several possible solutions:

1.  Define the inner constructor as `Particle(mass::C, velocity::C, height::C) where {C <: Complex}`, i.e., replace `Particle{C}` with `Particle`.

2.  Move the constructor outside the `struct`, making it an *outer constructor*.
    Outer constructors are defined *outside* the `struct` statement, hence the name.
    You have less constraints when you define them, but they can no longer rely on `new()` and must instead call an inner constructor.
    Here is a reworked version of our example:

    ```julia
    const g = 9.81

    struct Particle{E <: Real}
      kinetic_energy::E
      potential_energy::E

      # No inner constructor, let's use the one provided by Julia
    end

    # Note that we do *not* specify `Particle{C}`, as it is no longer
    # an inner constructor!
    function Particle(mass::C, velocity::C, height::C) where {C <: Complex}
      kinetic_energy = 1/2 * abs(mass) * abs(velocity)^2
      potential_energy = abs(mass) * g * abs(height)

      E = typeof(kinetic_energy)
      // Call the (default) inner constructor
      return Particle{E}(kinetic_energy, potential_energy)
    end
    ```

# Smart use of `promote`

Suppose you need to define a type to represent a 3D vector.
The three components should be floating-point numbers, as you are going to compute the norm of the vector, taking cross products, etc., and all these operations are defined for real numbers.
On the other hand, you want to be able to quickly instantiate vectors using integer components:

```julia
e_x = Vec(1, 0, 0)   # Easier to type and read than `Vec(1.0, 0.0, 0.0)`
```

Let’s look at a few possible ways to define a 3D vector that is handy to use and does the “right” thing in typical situations.

We can attempt to define `Vec` in the following way:

```julia
"A 3D vector"
struct Vec{T <: AbstractFloat}  # Force `T` to be a floating-point type
    x::T
    y::T
    z::T
end
```

Let’s now define the three basis vectors $\hat e_x$, $\hat e_y$, $\hat e_z$.
Unfortunately, we cannot use the notation `Vec(1, 0, 0)` for $\hat e_x$, as Julia would complain that we are passing integers instead of floats.
It is the problem we mentioned above!
Rather, we must type

```julia
ex = Vec(1., 0., 0.)
ey = Vec(0., 1., 0.)
ez = Vec(0., 0., 1.)
```

or

```julia
ex = Vec{Float64}(1, 0, 0)
ey = Vec{Float64}(0, 1, 0)
ez = Vec{Float64}(0, 0, 1)
```

Both solutions are quite ugly.
However, we can define an *outer* constructor that performs the correct conversion:

```julia
function Vec(x, y, z)
    xp, yp, zp = promote(float(x), float(y), float(z))
    T = typeof(xp)
    return Vec{T}(xp, yp, zp)
end
```

We use `float()` to convert integer types to a suitable floating point type, and `promote` returns a tuple where all the value are “pushed” up to the smallest type capable to hold all the values.
This means that even if we pass a `Float64` for `x`, a `Float32` for `y`, and a `Int8` for z (weird case!), the result will be that `xp`, `yp`, and `zp` will all be `Float64`:

```julia
julia> Vec(1, 0, 0)
Vec{Float64}(1.0, 0.0, 0.0)

julia> Vec(1.0f0, 0.0f0, 0.0f0)
Vec{Float32}(1.0f0, 0.0f0, 0.0f0)

julia> Vec(1.0f0, Int16(2), Int8(3))
Vec{Float64}(1.0, 2.0, 3.0)
```

Note that in the latter case Julia uses `Float64` despite the fact that we only passed integers and `Float32`, so `Float32` would have been enough.
The problem is that `float()` converts integers to `Float64` by default, hence the result.
If you prefer to use the smallest `FloatXX` type available, just invert the order between `promote()` and `float()`:

```julia
function Vec(x, y, z)
    xp, yp, zp = (float(val) for val in promote(x, y, z))
    T = typeof(xp)
    return Vec{T}(xp, yp, zp)
end
```

With this definition, our last example produces a `Vec{Float32}` object:

```julia
julia> Vec(1.0f0, Int16(2), Int8(3))
Vec{Float32}(1.0, 2.0, 3.0)
```


# Making Unitful-compatible types

Be aware that there are cases when it is better to mark the fact that different fields in a `struct` have different types, even if they take the same amount of memory.
Let's consider a structure holding the coordinates of a 2D point in polar coordinates.
A naive implementation could be the following:

```julia
struct PolPoint{T <: Number}
    r::T
    θ::T
end
```

The intent of the programmer was surely to let the user use `Float64`, `Float32`, or even `BigFloat` to keep the three components of the coordinates.
That's the reason why they declared `PolPoint` as a parametric type.

However, if `PolPoint` is used in a code that keeps track of measurement units through the [Unitful.jl](https://painterqubits.github.io/Unitful.jl/stable/) package, troubles will arise.
The `r` coordinate is a length, while `θ` is an angle, and thus they cannot be of the same type `T`!

The correct solution is to define `PolPoint` in the following way:

```julia
struct PolPoint{L <: Number, A <: Number}
    r::L
    θ::A

    # Inner constructor to perform basic checks and
    # prevent Julia from creating a default one
    function PolPoint{L, A}(r, θ) where {L, A}
        r ≥ zero(r) || error("Invalid value for r = $r")
        new{L, A}(r, θ)
    end
end

# Since we stopped Julia from providing a default inner
# constructor, this outer constructor won’t be shadowed
# by it
function PolPoint(r, θ)
    rp = float(r)
    θp = float(θ)
    L = typeof(rp)
    A = typeof(θp)
    return PolPoint{L, A}(rp, θp)
end
```

where `L` marks the fact that the type encodes a length, while `A` encodes an angle.
If the caller does not care about measurement units, they are able to use the type as usual:


```julia
julia> PolPoint(3, π/2)
PolPoint{Float64, Float64}(3.0, 1.5707963267948966)
```

But the type is able to work well with Unitful.jl as well:

```julia
julia> import Unitful: °, m

julia> PolPoint(1m, 90°)
PolPoint{
    Unitful.Quantity{Float64, 𝐋, Unitful.FreeUnits{(m,), 𝐋, nothing}},
    Unitful.Quantity{Float64, NoDims, Unitful.FreeUnits{(°,), NoDims, nothing}}
}(1.0 m, 90.0°)
```


# Use of `@kwdef`

Since Julia 1.9, the macro [`@kwdef`](https://docs.julialang.org/en/v1/base/base/#Base.@kwdef) is publicly available to help designing easy-to-use types.
It implements a constructor that takes the parameters from keyword parameters named after the fields of the `struct`:

```julia
@kwdef struct SimulationParameters
    input_file::String
    output_file::String
    error_threshold::Float64 = 1e-7
    num_of_iterations::Int = 100
end

params = SimulationParameters(
    input_file = "foo.txt",
    output_file = "bar.txt",
    # Do not specify `error_threshold` and use the default value
    num_of_iterations = 500,    # Use a value different than the default
)
```

The biggest advantage in using `@kwdef` is readability.
Compare the call above to the constructor with one which does not use keywords:

```julia
struct SimulationParameters
    input_file::String
    output_file::String
    error_threshold::Float64
    num_of_iterations::Int
end

# Without keywords, how can I tell if "foo.txt" is the input or output file?
# And I must pass the value for `error_threshold`, as I could not specify
# default values when I defined the type
params = SimulationParameters("foo.txt", "bar.txt", 1e-7, 500)
```

You can inspect the implementation of `@kwdef` in Julia’s [GitHub repository](https://github.com/JuliaLang/julia/blob/b79856e7a84b7c945590cafae74efbeaf4d9d8f9/base/util.jl#L545).

There is one thing you should be aware of when using `@kwdef` with parametric types.
Consider this example:

```julia
@kwdef struct GasOfParticles{T <: Real}
  num_of_particles::Int64 = 10_000
  temperature::T = zero(T)
end
```

We use `GasOfParticles` to simulate an ideal gas in thermal equilibrium, and we want that the temperature be zero when not specified.
This definition implements a constructor that accepts no parameters at all, as all the fields have a default value.
This constructor happily accepts that you avoid passing a specific type `{T}`, but then Julia complains because `T` is undefined!

```julia
julia> GasOfParticles(num_of_particles = 100)
ERROR: UndefVarError: `T` not defined
Stacktrace:
 [1] top-level scope
   @ REPL[2]:1
```

Of course, things work if you remember to supply the parametric type within curly braces:

```julia
julia> GasOfParticles{Float64}(num_of_particles = 100)
GasOfParticles{Float64}(100, 0.0)
```

In this simple example, spotting the error’s location is straightforward.
However, in more intricate codebases, the error message `` `T` is not defined `` might be challenging to understand because it does not state that the issue was in the call to `GasOfParticles(…)`.


# Acknowledgements

Thanks a lot to the people on the [Julia Forum](https://discourse.julialang.org/) for useful discussions.
See in particular the posts in the two threads [How to use `@kwdef` with parametric types and inner constructors](https://discourse.julialang.org/t/how-to-use-kwdef-with-parametric-types-and-inner-constructors/107948) and [Constructors for parametric types](https://discourse.julialang.org/t/constructors-for-parametric-types/119971).

# Edits

Patrick Häcker [suggested](https://discourse.julialang.org/t/new-blog-post-about-julia-parametric-types-and-constructors/120717/7) to use polar coordinates instead of spherical coordinates in the example in [Making Unitful-compatible types](##making-unitful-compatible-types).
