---
layout: post
title:  "Multilingual CVs"
date:   2025-05-07
categories: typesetting
---

One requirement of my employer (the University of Milan) is that you upload your CV on your institutional page in *two* copies: one in Italian and one in English.

My first approach was to keep two documents: one in Italian and another in English. Every time I added/modified an entry to the CV, I also had to remember to update the English translation. This worked, but it was pretty dull and cumbersome, as this required me to find the right spot to modify the text twice: first in `cv-ita.tex`, then in `cv-eng.tex`. Moreover, complex modifications could require me to jump back and forth between the two files a few times.

# LaTeX to the rescue

Then, one day, I realized that there was a better solution. TeX supports the `\ifx` command, which permits conditional branches and could let me keep together the Italian and English text. The trick is to comment/uncomment a `\def\useitalian{1}` instruction and then fill the remainder of the file with `\ifx\useitalian\undefined`…`\else`…`\fi`, like in the following example:

```latex
\documentclass{article}

% Uncomment to get a CV in Italian
%\def\useitalian{1}

\usepackage{polyglossia}

\ifx\useitalian\undefined
\setdefaultlanguage{english}
\else
\setdefaultlanguage{italian}
\fi

\begin{document}

\ifx\useitalian\undefined
\title{My CV}
\else
\title{Il mio CV}
\fi

\author{Maurizio Tomasi}
\maketitle

\ifx\useitalian\undefined
English text
\else
Testo in italiano
\fi

\end{document}
```

If you compile this file with `latexmk --lualatex cv.tex`, you will end up with this:

![](/assets/2025-05-07-multilingual-cvs-with-typst/latex-title-en.png)

But if you remove the comment from the line with `\def\useitalian{1}`, you will get a document in Italian:

![](/assets/2025-05-07-multilingual-cvs-with-typst/latex-title-it.png)


With the new setup, things worked pretty well. However, the presence of `\ifx\useitalian\undefined` in the LaTeX source was a bit heavy to read, and the text did not flow as pleasantly as I would have liked.

# Typst

Several months ago, I heard of [Typst](https://typst.app/), a new typesetting language that aims to provide a better way to produce PDF documents. At the time, I was intrigued enough to have a look at the documentation, but what I found was not sufficient to make the switch from LaTeX:

-   I am too accustomed to writing equations using LaTeX syntax, and while Typst uses a much nicer and friendlier syntax, it is incompatible.
-   If you submit a paper to a scientific journal, you must submit it as a Microsoft Word document (standard in the Humanities) or LaTeX (the *de facto* rule in Physics).

There is also the significant downside that Typst can only produce PDF files at the moment. (HTML output is underway, and once it is available, Typst could become a viable alternative to Markdown or Restructured Text!)

However, for CVs, it seems perfect:

-   The quality of the output is excellent.
-   Unlike LaTeX, Typst implements a *real* programming language: you can write text *and* code in your `.typ` files to generate text automatically.

So I decided to play with Typst to convert my CV. An update to it was long overdue, and it would have been nice to compare Typst with LaTeX.

# From LaTeX to Typst

I created my LaTeX CV using [Awesome CV](https://github.com/posquit0/Awesome-CV), so I started looking for something similar. I found [modern-cv](https://typst.app/universe/package/modern-cv/), which presents itself as “a modern resume template based on the Awesome-CV Latex template”: good!

It was trivial to start working. The following command creates a folder with an initial template in `resume.typ` and a few ancillary files:

```sh
$ typst init @preview/modern-cv:0.8.0
```

Then, in `resume.typ` I implemented a simple function that takes two inputs (`en_text` and `it_text`) and injects in the output either one or another, depending on the value of a global variable `lang`:

```typst
#let text(en_text, it_text) = {
  if lang == "en" {
    en_text
  } else if lang == "it" {
    it_text
  } else {
    "Language not supported: " + lang
  }
}
```

To set the variable `lang`, I chose to use [Just](https://github.com/casey/just) to create a `config.typ` file containing its definition. The following is the content of my `Justfile`:

```just
make-en:
    echo '#let lang = "en"' > config.typ
    typst compile resume.typ resume_en.pdf

make-it:
    echo '#let lang = "it"' > config.typ
    typst compile resume.typ resume_it.pdf
```

Then, in `resume.typ`, I load the value of `lang` from `config.typ`, so that the beginning of the file is now

```typst
#import "@preview/modern-cv:0.8.0": *
#import "config.typ": lang

#let text(en_text, it_text) = {
  if lang == "en" {
    en_text
  } else if lang == "it" {
    it_text
  } else {
    // Default or error message if language is not set correctly
    "Language not supported: " + lang
  }
}

// Etc.
```

It is now possible to use the `text()` function in the remainder of the file. Typst requires you to prepend functions with the `#` sign to distinguish them from plain text that must end up in the PDF, so the following is an example:

```typst
= #text("Positions", "Carriera")

#resume-entry(
  title: text("Associate professor", "Professore associato"),
  location: text("University of Milan", "Università degli Studi di Milano"),
  date: "2020 –",
  description: text("Full-time position", "Posizione a tempo pieno")
)
```

A few notes:

-   A line beginning with `=` identifies a new section, like `#` does in Markdown
-   `#resume-entry` tells Typst that this is a function call to `resume-entry`. Within the parentheses I specify the parameters to the functions, and in this case I do not need to prepend `text` with `#`, because I am already inside some code.

Typst lets you to specify formatted text as the parameter for a function by enclosing it into square brackets. This works well when the text is long and you want to split it into several lines:

```typst
= #text("Research", "Ricerca")

#text([
I am an instrumental/computational physicist and am mostly
interested in instrumentation for radioastronomy, in
particular in the context of CMB cosmology.
], [
Sono un fisico sperimentale/computazionale interessato
soprattutto nella strumentazione per la radioastronomia,
in particolare nel contesto della cosmologia della CMB.
])
```

# The result

If I run

```sh
$ just make-en
```

in almost no time (Typst is much faster than LaTeX!) I get the file `resume-en.pdf`:

![](/assets/2025-05-07-multilingual-cvs-with-typst/resume-en.png)

If I instead run

```sh
$ just make-it
```

I get the file `resume-it.pdf`:

![](/assets/2025-05-07-multilingual-cvs-with-typst/resume-it.png)

# Conclusions

I am delighted with the result! Typst’s syntax is elegant and resembles Markdown, but it hides a powerful programming language. (People even implemented a [Mandelbrot calculator](https://github.com/SeniorMars/typst-raytracer/blob/main/mandel.typ) using it!)

At the moment, only PDF output is supported, and the syntax for equations differs from LaTeX, which limits its scope. However, if this is of no bother to you, you should try it!
