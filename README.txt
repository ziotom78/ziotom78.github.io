# Quick start

Set up `bundle` so that it does not mess up with system packages:

    export GEM_HOME=$HOME/.gem

Now install the dependencies:

    bundle install

To run a local copy of the site:

    bundle exec jekyll serve --livereload


# How to create new posts

Simply create a new text file with the extension `.markdown` in the `_posts` directory.

Be sure to keep one sentence per line.


## How to use LaTeX in posts

    ---
    layout: post
    title:  "Welcome to Jekyll!"
    date:   2023-11-15 17:33:40 +0100
    categories: jekyll update
    katex: True
    ---
    ```c++
    int main() {}
    ```

    Jekyll also offers powerful support for code snippets:

    ```ruby
    def print_hi(name)
      puts "Hi, #{name}"
    end
    print_hi('Tom')
    #=> prints 'Hi, Tom' to STDOUT.
    ```

    inline: $$f(x) = \int_{-\infty}^\infty \hat f(\xi)\,e^{2 \pi i \xi x} \,d\xi$$ display mode (centered):

    $$f(x) = \int_{-\infty}^\infty \hat f(\xi)\,e^{2 \pi i \xi x} \,d\xi$$

    Check out the [Jekyll docs][jekyll-docs] for more info on how to get the most out of Jekyll. File all bugs/feature requests at [Jekyll’s GitHub repo][jekyll-gh]. If you have questions, you can ask them on [Jekyll Talk][jekyll-talk].

    [jekyll-docs]: https://jekyllrb.com/docs/home
    [jekyll-gh]:   https://github.com/jekyll/jekyll
    [jekyll-talk]: https://talk.jekyllrb.com/
