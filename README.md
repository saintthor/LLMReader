# LLMReader
Runs on the article list page, pre-reads articles based on LLM and picks out content of interest.

（中文版在底部）

----

When reading articles from a website's list page, time is wasted because the proportion of actually interesting content is low. Judging merely by titles and tags is not accurate enough, an AI tool is needed to read the article content and assist in judging.

This tool runs on article list webpages and uses large language models to preview articles from the list and pick out interesting content.

After opening the list page, you can run the code in reader.js from the browser console, or create a bookmark with javascript: at the beginning and as the bookmark URL. For the bookmark usage, there are no comments starting with // in the code.

The main object is an instance R of LLMReader. It has two important members: Site is a subclass of BaseSite, defined separately for each website; LLM is a subclass of BaseLLM, defined for each language model.

When calling R.Start(); or R.Continue();, R.Site.GenURLs iterates through urls of articles on the webpage, opens tabs to read contents, sends contents to API of the large model by R.LLM.Check, and gets replies via R.LLM.Receive. If the content is judged as uninteresting, the opened tab will be closed.

The judging principle is defined in BaseLLM.Prompt. Users can refine it to handle the rare cases where English summary may be returned.

R.Start() and R.Continue() can take a natural number parameter defining the number of articles checked each time. The difference is that Start always starts iterating from the beginning of pages, while Continue continues from where it left off last time. Generally just use Continue.

You can preset an end point: by localStorage.setItem('KrLast', url); set the url of an article as the end point, it only needs to be set once, and the iteration will stop when reaching it, automatically updating the url of the first article read this time as the new end point. Note different websites need different keys.

----

从网站的列表页阅读文章时，由于实际感兴趣的内容的比例较低而浪费了时间。仅由标题和标签判断不准确，需要一个 AI 工具读取文章内容后协助判断。

这个工具运行在文章列表网页里，基于语言大模型预读列表中的文章，选出感兴趣的内容。

可以打开列表页后，在浏览器的 console 里运行 reader.js 中的代码，也可以新建一个书签，在完整代码前加 javascript: 后作为书签的 URL。为了后一种用法，代码中没有以 // 开头的注释。

主体是 LLMReader 的实例 R，它有两个重要成员，Site 是继承 BaseSite 的子类，对每个网站单独定义一个；LLM 是继承 BaseLLM 的子类，对每种语言大模型定义一个。

运行 R.Start(); 或 R.Continue(); 时，由 R.Site.GenURLs 迭代网页文章的 url，打开标签页读取内容，将内容由 R.LLM.Check 发给大模型的 API，再由 R.LLM.Receive 读取回复。若判断为不感兴趣的内容，关闭前面打开的标签页。

判断的原则在 BaseLLM.Prompt 里定义。用者可以自行完善一下，在极少情况下仍可能返回英文的 summary。

R.Start() 和 R.Continue() 可以带一个自然数参数，定义每次检查的页数。两者的区别在于，Start 每次都从页的开头开始迭代，而 Continue 会从上次读过的位置开始迭代。一般用 Continue 即可。

可以预设结束点：通过 localStorage.setItem( 'KrLast', url ); 将一篇文章的 url 设为结束点，只需设置一次，迭代到此即终止并自动将本次阅读的第一篇文章的 url 更新为结束点。注意对于不同的网站，结束点要用不同的 key。


