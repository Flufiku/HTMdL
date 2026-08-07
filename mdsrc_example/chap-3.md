# This is a normal heading again.

The chapter to show should be signaled using a URL Query param using numbers and /or letters. The chapters correspond to their numbers, when the sources are opened the param should say `sources`.

If a chapters markdown file starts with a # headline, the headline should be used as the chapter name. If it does not start with a # headline, the chapter name should be "Chapter X", where X is the number of the chapter.

At the top of the page, but below the first # headline, there should be a selector to jump to different chapters. The selector should show the chapter names, and when a chapter is selected, the page should jump to that chapter. Users should only be able to jump to chapters they have already unlocked. Chapters are unlocked by reading the previous chapters and pressing the "next chapter" buttona at the bottom. The first chapter is always unlocked. The unlocked chapters should be stored in the browser using a cookie or local storage or similar. Sources should also always be unlocked, and should be the last chapter. 

The sources page should show all sources from all chapters, and should have a link back to the chapter where the source was used. The sources should be numbered in the order they were used in all the chapters, starting with 1. 

There should also be a small "up" button at the bottom right of the page, which when clicked, scrolls the page back to the top.

The sources page should always be the very last chapter. It has no own markdown page, it is instead generated from the sources in all other chapters. The sources should all be formated like this: `[1]: https://link-to-source.exampleurl`, with the `[1]` linking back to the place the source is for. 