---
layout: post
title:  "Use of `unsigned int` in C++"
date:   2025-02-02
categories: c++
katex: True
---

Often students learning how to use C++ vectors write codes like this:

```c++
#include <iostream>
#include <vector>

using namespace std;

int main() {
    vector v{1, 2, 3, 4, 5};

    for(int i{}; i < v.size(); ++i) {
        cout << v.at(i) << "\n";
    }
}
```

Inevitably, the warning produced by the compiler always puzzles them:

```
$ g++ -o -g3 -Wall --pedantic test test.cpp
test.cpp: In function ‘int main()’:
test.cpp:9:18: warning: comparison of integer expressions of different signedness: ‘int’ and ‘std::vector<int, std::allocator<int> >::size_type’ {aka ‘long unsigned int’} [-Wsign-compare]
    9 |   for(int i{}; i < v.size(); ++i) {
      |                ~~^~~~~~~~~~
/usr/bin/ld: test: _ZSt4cout: invalid version 2 (max 0)
/usr/bin/ld: test: error adding symbols: bad value
collect2: error: ld returned 1 exit status
```

(Note: you do not get this warning unless you specify `-Wall`; but you should *always* use `-Wall`!)

My standard explanation is that the warning is motivated by the fact that `std::vector::size()` returns an unsigned integer, while the `i` variable is signed. (This is exactly what the compiler prints, but it seems that students do not like to carefully read compiler’s messages!)

One of them wasn’t entirely satisfied by my explanation that `size()` should actually have been declared as `int` by the C++ standard, and he wrote me this email:

> …at first glance it doesn't seem entirely unreasonable to use an index variable without a sign for array and vector dimensions. A vector of dimension -5 doesn't make sense, so it would seem reasonable to remove ambiguity on the sign. I think the problem actually concerns managing vectors and arrays, because using an unsigned value, even when doing a loop for example, requires casting.

He’s right: using a *signed* integer to hold the number of items in a vector would look weird! However, there are subtle problems with `unsigned` integers, and the newest version of the C++ standard mandate for a new solution in the form of the new [`ssize()`](https://en.cppreference.com/w/cpp/iterator/size) function.

Consider a 32-bit integer, which can assume any value in the range -2,147,483,648…+2,147,483,647. If the variable `x` holds the value -2147483648 and you decrement it, causing an *underflow*, the C++ standard doesn’t specify what happens. Usually, you get the maximum value (+2147483647), but on specific machines, the program might crash or even freeze the machine (the same applies to the opposite, known as *overflow*).

When underflow/overflow occurs, it’s usually unintentional and a problem in 99% of cases. If possible, the solution is to declare `x` as 64-bit (using `int64_t`). If you know that `abs(x)` will always be much smaller than a billion, you can sleep peacefully.

Now, let’s talk about the woes of unsigned variables. There’s a significant difference in increments and decrements here, because the C++ standard *guarantees* that if you decrement an unsigned variable equal to 0, you’ll get the maximum value (which for 32-bit integers is 4294967295). If you increment the maximum value 4294967295, you’ll get zero.

On the one hand, this is nice because you always know what to expect. On the other hand, from an algorithmic perspective, this behavior can cause problem: in the typical lifetime of an integer variable, it happens often that its value becomes zero, and it’s not always the best thing to make a decrement (or subtraction, for that matter) *increase* the value of that variable!

For example, consider this code that prints the elements of an array `vect`, which uses an unsigned counter (`size_t`):

```cpp
for(size_t i{}; i < vect.size(); ++i) {
    cout << vect[i] << "\n";
}
```

Because `vect.size()` already returns `size_t` (an unsigned integer), there’s no need for any cast: the program compiles without warnings and works perfectly. It seems so easy!

Now, suppose you must modify the code to print the vector elements in reverse order. You diligently change it to make it like this:

```cpp
for(size_t i{vect.size() - 1}; i >= 0; --i) {
    cout << vect[i] << "\n";
}
```

But the code is wrong because, in one fell swoop, you've introduced *two* problems:

1. The loop shouldn’t print anything if the vector is empty. But in the above code, since `vect.size() == 0`, the variable `i` is initialized to the value `vect.size() - 1`, which is a huge and positive value and will cause problems in evaluating `vect[i]`

2. The condition `i >= 0` is always true, because `i` is unsigned; thus, the statement `--i` is executed even when `i == 0`, causing an underflow and making `i` enormous. Again, `vect[i]` will cause problems in the next loop iteration.

The right way to implement reverse printing is as follows, which isn’t intuitive but at least it’s correct:

```cpp
if(vect.size() > 0) {
    size_t i{vect.size() - 1};
    while(true) {
        cout << vect[i];
        if(i == 0)
            break;
        --i;
    }
}
```

This is why C++20 introduced [`std::ssize()`](https://en.cppreference.com/w/cpp/iterator/size), a *function* which returns a *signed* integer containing the number of elements in any container: a vector, an array, etc. This fantastic little function makes the code more natural when iterating forwards *and* backwards:

```cpp
// Forward loop. It works even if `vect` is empty
for(int i{}; i < std::ssize(vect); ++i) {
    cout << vect[i] << "\n";
}

// Backward loop. It works even if `vect` is empty
for(int i{std::ssize(vect) - 1}; i >= 0; --i) {
    cout << vect[i] << "\n";
}
```

(Alongside `ssize()`, the C++ standard mandates the presence of `size()`, which still returns an unsigned integer and is just a wrapper around `std::vector::size()`, `std::array::size()`, and so on. The `size()` function was introduced in C++17.)

As I hope to have explained, the problem with `unsigned` integers is that their wrapping behavior forces you to be careful every time you perform a decrement or subtraction. This problem also affects signed integers (and in some sense, it’s even more severe because the C++ standard doesn’t tell you what will happen!). Still, it occurs less frequently because it only triggers when variables take on huge values (±2 billion for 32-bit integers).

Using unsigned integers to indicate the number of elements in a set might seem a good idea. Still, decades of experience from thousands of programmers have shown that it’s actually *a bad solution* in practice.

A quick look at the way more recent languages deal with unsigned numbers reveals that the lesson seems to have been learned:

-   Here is a post from the Nim programming language forum where Araq (Andras Rumpf, creator of Nim) shares his thoughts on unsigned numbers: <https://forum.nim-lang.org/t/313#1631>

-   The Julia language marks a clear distinction between signed and unsigned numbers by printing the latters using hexadecimal notation: <https://docs.julialang.org/en/v1/manual/integers-and-floating-point-numbers/#Integers>

-   The Ada language forces you to use a more verbose syntax for unsigned numbers: <https://learn.adacore.com/courses/intro-to-ada/chapters/strongly_typed_language.html#unsigned-types>. Moreover, Ada checks underflows and overflows for signed integers, and it makes the program crash whenever one of them happens. This is almost always the best choice!
