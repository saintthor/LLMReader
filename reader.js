( function() {
class BaseSite
{
    constructor( doc )
    {
        this.Document = doc || document;
        this.DoneURLs = [];
        this.Max = 10;
        this.StartAt = null;
    }

    async *GenPage( url )
    {
        for( let i = 3; i--; )
        {
            let AtclWindow = window.open( url, '_blank' );
            if( AtclWindow )
            {
                let DocLoaded = new Promise(( resolve, reject ) =>
                {
                    AtclWindow.addEventListener( 'load', () => resolve( AtclWindow.document.documentElement ));
                } );

                try
                {
                    let Doc = await Promise.race( [DocLoaded, new Promise(( resolve, reject ) =>
                                            setTimeout(() => reject( new Error( 'time out.' )), 15000 ))] );
                    if( !( yield Doc ))
                    {
                        AtclWindow.close();
                    }
                    break
                }
                catch( e )
                {
                    console.log( 'GenPage error', e, url );
                    AtclWindow.close();
                }
            }
            await new Promise( r => setTimeout( r, 2000 ));
        }
    }

    *GenURLs() {}
    GetContent( page ) {}
}

class Site0 extends BaseSite
{
    constructor()
    {
        super();
        for( let exist of document.querySelectorAll( "#site0reader" ))
        {
            exist.remove();
        }
        const Right = document.querySelector( ".kr-information-right" ).children[0];
        this.LabelDom = document.createElement( "div" );
        this.LabelDom.innerHTML = '<a href="javascript:R.Continue()">Continue</a><br><br><a href="javascript:R.Start()">Start</a><br><br><a href="javascript:R.Site.Finish()">Finish</a>';
        this.LabelDom.style = "position:fixed; background-color:#f3f3f3; z-index:99; padding: 16px";
        this.LabelDom.id = "site0reader";
        Right.parentNode.insertBefore( this.LabelDom, Right );
    }

    *GenURLs()
    {
        this.LastRead = localStorage.getItem( 'KrLast' );
        for( let item of this.Document.querySelectorAll( '.information-flow-item' ))
        {
            let TpcA = item.querySelector( 'p.title-wrapper>a' );

            if( this.StartAt )
            {
                if( this.StartAt == TpcA.href )
                {
                    this.StartAt = null;
                }
                continue;
            }

            if( !TpcA.href || this.DoneURLs.includes( TpcA.href ))
            {
                continue;
            }

            if( TpcA.href == this.LastRead )
            {
                let HRs = document.createElement( "div" );
                HRs.innerHTML = '<hr><hr><hr>';
                item.parentNode.insertBefore( HRs, item );
                this.LabelDom.innerHTML = 'Finished.';
                console.log( 'finished:', TpcA.href );
                if( this.DoneURLs.length > 0 )
                {
                    localStorage.setItem( 'KrLast', this.DoneURLs[0] );
                }
                localStorage.setItem( 'KrStartAt', '' );
                return;
            }

            if( --this.Max < 0 )
            {
                break;
            }

            let Rslt = yield TpcA.href;

            if( Rslt && Rslt.summary )
            {
                if( !Rslt.match )
                {
                    item.querySelector( 'div.kr-flow-article-item' ).style.backgroundColor = '#eee';
                    item.querySelector( 'p.title-wrapper>a' ).style.fontSize = '16px';
                }
                else
                {
                    if( Rslt.match.toLowerCase().includes( 'blockchain' ))
                    {
                        Rslt.summary += "<a href='https://github.com/saintthor/decentralization' target='_blank'>原子物权链</a>是极致去中心化的区块链，将颠覆现有区块链技术。"
                    }
                    this.SummaryDom.innerHTML += '<br>' + Rslt.match + '&emsp;' + Rslt.score + '&emsp;' + Rslt.keywords.join( '|' ) + '<br>' + Rslt.summary;
                }

                let Summary = document.createElement( "div" );
                Summary.innerHTML = '<div>' + !!Rslt.match + '&ensp;' + Rslt.match + '&emsp;' + Rslt.score + '</div>' + Rslt.summary;
                item.parentNode.insertBefore( Summary, item.nextSibling );
                console.log( 'add summary:', TpcA.href );
            }
            this.DoneURLs.push( TpcA.href );
        }

        if( this.DoneURLs.length > 0 )
        {
            localStorage.setItem( 'KrStartAt', this.DoneURLs[this.DoneURLs.length - 1] );
        }
    }

    LoadStartAt()
    {
        this.StartAt = localStorage.getItem( "KrStartAt" );
    }

    Finish( first )
    {
        first = first || this.DoneURLs[0];
        localStorage.setItem( 'KrLast', first );
        localStorage.setItem( 'KrStartAt', '' );
        this.DoneURLs = [];
    }

    GetContent( doc )
    {
        if( doc )
        {
            let TextDom = doc.querySelector( 'div.article-content' );
            let TitleDom = doc.querySelector( '.article-title' );
            this.SummaryDom = doc.querySelector( 'div.summary' );
            if( TextDom && TitleDom )
            {
                return {
                    "text": TextDom.textContent,
                    "title": TitleDom.textContent
                        };
            }
        }
    }
}

class BaseLLM
{
    constructor()
    {
        this.Prompt = ["You are my reading assistant. I will send you an article. Please read through the text and write a summary in English (around 200 words). Then translate the summary to Chinese.",
        "Determine carefully which category dose the article belong to. The seven categories are: Blockchain/cryptocurrency, AI/LLM, New advances in Science, Technology advances, medical science, Psychology and Other for none of the previous.",
        "Base on the summary and the title of the article, answer the following questions with yes or no:",
        "1. Is this article primarily about a company?",
        "2. Does this article describe a new or improved technology?",
        "3. Is this article primarily about policy of governments?",
        "4. Is this article primarily about new scientific advances?",
        "5. Is this article primarily about psychology?",
        "6. Is this article primarily about a city?",
        "7. Is this article primarily about innovation in business methods?",
        "8. Is this article mostly about blockchains?",
        "9. Is this article primarily about finance or capital?",
        "10. Is this article primarily about fashion or dressing?",
        "11. Is this article mostly about consumer electronics?",
        "12. Is this article primarily AI/LLM?",
        "13. Is this article a news roundup?",
        "Guarantee there are 13 answers. Join the 13 yes/no answers of the previous questions with '|' into one string.",
        "Return the results in one JSON format including the following nine keys:",
        "match - String. If the article's spirit matches any of the categories, set this key to the matched. Else set to a blank string.",
        "englishsummary - The English summary.",
        "summary - The Chinese summary translated from the English summary.",
        "answers - The answer string consisting of yes and no separated by '|'",
        "subject - The most prominent subject in Chinese and no more than 4 characters, mentioned in this article. It can be a person, company/organization, etc.",
        "predicate - The most prominent predicate in Chinese and no more than 4 characters, used to describe the subject in this article.",
        "term - The most frequently mentioned keyword in Chinese and no more than 4 characters, of science/technological term in the article.",
        "business - The most frequently mentioned keyword in Chinese and no more than 4 characters, of business model in the article.",
        "capital - The most frequently mentioned keyword in Chinese and no more than 4 characters, about capital/finance in the article.",
        "id - the Id in the input data.",
        "If the categorization is done right, you'll get a $100 tip. The article is:\n"].join( '\n' );
    }

    Check() {}
    Ask() {}
}

class GeminiPro extends BaseLLM
{
    constructor()
    {
        super();
        this.APIKey = localStorage.getItem( 'GeminiK' ) || "";
        this.ReqTime = new Date().getTime();
        import( 'https://esm.run/@google/generative-ai' ).then(( module ) =>
        {
            const genAI = new module.GoogleGenerativeAI( this.APIKey );
            this.Model = genAI.getGenerativeModel( { model: "gemini-pro" } );
        } ).catch(( error ) =>
        {
            console.error( 'import failed：', error );
        } );
    }

    async Receive( req )
    {
        console.log( 'Receive', req );
        if( !req )
        {
            return '';
        }
        const result = await req;
        const response = await result.response;
        return response.text();
    }

    async Check( article )
    {
        console.log( 'Check', article.title );
        let TimeDiff = 1200 - new Date().getTime() + this.ReqTime;
        if( TimeDiff > 0 )
        {
            await new Promise( r => setTimeout( r, TimeDiff ));
        }
        article.text = article.text.slice( 0, Math.min( article.text.length, 3000 ) - Math.floor( Math.random() * 100 ));
        const Request = this.Model.generateContent( this.Prompt + '\n\n' + JSON.stringify( article ));
        this.ReqTime = new Date().getTime();

        let RsltJ = await this.Receive( Request );
        let match = /{(.+)}/.exec( RsltJ.replace( /\n/g, '' ));
        if( match )
        {
            RsltJ = match[0];
        }
        let Result = JSON.parse( RsltJ );
        if( !( await this.Evaluate( Result.summary )))
        {
            Result.summary = await this.Translate( Result.englishsummary );
            if( !( await this.Evaluate( Result.summary )))
            {
                return
            }
        }
        return this.Make( Result, article );
    }

    Make( rslt, atcl )
    {
        rslt.match = ( rslt.match || "" ).replace( /(other|none)/gi, '' );
        rslt.score = rslt.match ? 60 : 0;
        rslt.keywords = [rslt.subject, rslt.predicate, rslt.term, rslt.business, rslt.capital, rslt.answers];
        console.log( 'good format', rslt.keywords );

        let Answers = rslt.answers.toLowerCase().replaceAll( ' ', '' ).split( '|' );
        if( Answers.length != 13 )
        {
            console.log( 'Answers error:', Answers.length, rslt.answers );
        }
        else
        {
            let Subjects = ['公司', '技术', '政府', '科学', '心理', '城市', '商业', '区块链', '资本', '时尚', '消费电子', 'AI', '综述'];
            let DiffScores = [-10, 20, -50, 50, 50, -30, -10, 50, -30, -100, -20, 50, -20];
            for( let i in Answers )
            {
                if( Answers[i] == 'yes' )
                {
                    rslt.keywords.push( Subjects[i] );
                    rslt.score += DiffScores[i];
                    console.log( '*', Subjects[i] );
                }
            }
        }

        [['华为', -2], ['百度', -2], ['阿里', -1], ['腾讯', -1], ['拼多多', -2], ['微软', 1], ['谷歌', 2],
        ['苹果', -1], ['meta', 1], ['openai', 1], ['anthropic', 2], ['亚马逊', 1], ['排放', -2],
        ['碳', -1], ['汽车', -2], ['蔚来', -2], ['时尚', -5], ['宁德时代', -1], ['抖音', -2], ['双碳', -2],
        ['京东', -1], ['tiktok', -2], ['直播', -2], ['研发', 2], ['研究', 2], ['开创', 2], ['推出', 1],
        ['证明', 2], ['卸任', -2], ['裁员', -2], ['权力', -2], ['酒', -2], ['融资', -2], ['投资', -2],
        ['员工', -1], ['估值', -2]].forEach( item =>
        {
            let n = Math.min( atcl.title.split( item[0] ).length, 16 );
            console.log( 'include in title', item, n );
            rslt.score += n * 3 * item[1];
            n = atcl.text.split( item[0] ).length;
            console.log( 'include in text', item, n );
            rslt.score += n * item[1];
        } );

        return rslt;
    }

    async Ask( question )
    {
        console.log( 'Ask', question );
        let TimeDiff = 1200 - new Date().getTime() + this.ReqTime;
        if( TimeDiff > 0 )
        {
            await new Promise( r => setTimeout( r, TimeDiff ));
        }
        const Request = this.Model.generateContent( question );
        this.ReqTime = new Date().getTime();
        return await this.Receive( Request );
    }

    async Evaluate( summary )
    {
        let Fluentcy = await this.Ask( 'Evaluate the fluency of the following text. Only ”good“ or ”bad“.\n' + summary );
        console.log( 'Evaluate', Fluentcy );
        return Fluentcy.toLowerCase().replace( /[\"\'\.]/g, '' ) == 'good';
    }

    async Translate( s )
    {
        return await this.Ask( 'Translate the following text into Chinese.\n' + s );
    }
}

class Translator extends GeminiPro
{
    constructor( n )
    {
        super();
        for( let exist of document.querySelectorAll( "#aitranslator" ))
        {
            exist.remove();
        }
        this.Panel = document.createElement( "div" );
        this.Panel.innerHTML = '<a href="javascript:Tr.TranslateDom()">译中</a><br><a href="javascript:Tr.TranslateDom(\'en\')">译英</a><div></div>';
        this.Panel.style = "position:fixed; background-color:#f3f3f3; top:100px; left:15px; z-index:99; padding: 10px";
        this.Panel.id = "aitranslator";
        document.querySelector( 'body' ).insertBefore( this.Panel, null );
        this.DomBuff = [];
        this.BatchNum = n || 16;
        this.BuffHead = this.BuffTail = 0;
        this.History = new Map();
        this.EnDoms = this.GetEnDoms()
        console.log( 'Translator ready.' );
    }

    *GetEnDoms()
    {
        for( let dom of Array.from( document.querySelector( 'body' ).querySelectorAll( "div, p, li, h1, h2, h3, h4, h5, blockquote" )).filter(
                dom => dom.querySelectorAll( "div, p, li" ).length === 0 ).filter( dom =>
                {
                    if( dom.textContent.trim().length < 20 )
                    {
                        return false;
                    }
                    let LetterLen = dom.textContent.trim().replace( /[^a-zA-Z]/g, "" ).length;
                    return LetterLen * 2 > dom.textContent.trim().length && !this.LikeCSS( dom.textContent );
                } ).filter( this.SiteFilter ))
        {
            yield dom;
        }
    }

    async TranslateDom( target )
    {
        this.Panel.querySelector( 'div' ).innerHTML = 'start';
        const selection = window.getSelection();
        if( selection.toString())
        {
            let SelDom = selection.focusNode.nodeType === Node.TEXT_NODE? selection.focusNode.parentNode: selection.focusNode;
            this.DomBuff.push( [SelDom, selection.toString()] );
            this.BuffHead++;
        }
        else if( target != 'en' )
        {
            for( let n = this.BatchNum, dom = true; dom && n; )
            {
                dom = this.EnDoms.next().value;
                if( dom && !this.DomBuff.includes( [dom, ''] ))
                {
                    this.DomBuff.push( [dom, ''] );
                    this.BuffHead++;
                    n--;
                }
            }
        }
        await this.TransBuff( target );
        this.Panel.querySelector( 'div' ).innerHTML = 'over';
        console.log( 'over.' );
    }

    LikeCSS( s )
    {
        s = s.replace( /\n/g, '' );
        let OutLen = s.replace( /\{.*?\}/g, "" ).length;
        if( OutLen * 1.5 < s.length )
        {
            let s1 = s.replace( /(max|min|margin|padding|border|color|font|background|left|right|top|bottom|\d*px|width|height|position|media|opacity|size|index|\d*%|-webkit-|-moz-|inherit)/g, "" );
            if(( s1.length - s1.replace( /\{.*?\}/g, "" ).length ) * 3 > s.length - OutLen )
            {
                console.log( 'like css', s );
                return true;
            }
        }
    }

    SiteFilter( dom )
    {
        if( document.location.hostname.includes( '.newsminimalist.com' ))
        {
            console.log( 'SiteFilter: newsminimalist.com' );
            for( let li = 0; dom.parentNode; dom = dom.parentNode )
            {
                if( dom.parentNode.tagName === "LI" )
                {
                    if( ++li > 1 )
                    {
                        return false;
                    }
                }
            }
        }
        return true;
    }

    async TransBuff( target )
    {
        let Prompt = target == 'en' ? 'Translate the following text into English.\n': 'Translate the following text into Chinese.\n';
        for( ; this.BuffTail < this.BuffHead; )
        {
            this.Panel.querySelector( 'div' ).innerHTML = this.BuffHead - this.BuffTail;
            let [Dom, Text] = this.DomBuff[this.BuffTail++];
            Text = Text || Dom.textContent;
            let TransDom = document.createElement( "div" );
            if( this.History.has( Text ))
            {
                TransDom.innerHTML = this.History.get( Text );
            }
            else
            {
                let i = 3;
                while( i-- )
                {
                    try
                    {
                        TransDom.innerHTML = await this.Ask( Prompt + Text );
                        if( TransDom.innerHTML.length < 99 )
                        {
                            this.History.set( Text, TransDom.innerHTML );
                        }
                        break
                    }
                    catch( e )
                    {
                        console.error( 'TransBuff in Ask:', e );
                    }
                }
                if( i < 0 )
                {
                    continue;
                }
            }
            console.log( TransDom.textContent.slice( 0, 200 ));
            if( target == 'en' || TransDom.textContent.replace( /[^a-zA-Z]/g, "" ).length * 1.6 < TransDom.textContent.length )
            {
                Dom.insertBefore( TransDom, null );
            }
        }
    }
}

class LLMReader
{
    constructor( siteCls, llmCls )
    {
        this.Site = new siteCls();
        this.LLM = new llmCls();
        console.log( 'To pre-read the articles, you may run:\nR.Start();\nKr.Continue();\nTo ask the LLM, you may run:\nawait R.LLM.Ask( "..." );' );
    }

    async Start( max )
    {
        let u = this.Site.GenURLs();
        let Result = null;
        this.Site.Max = max || 10;

        while( 1 )
        {
            let url = u.next( Result );
            if( url.done )
            {
                break;
            }
            let p = this.Site.GenPage( url.value );
            let Doc = ( await p.next()).value;
            let Content = this.Site.GetContent( Doc );
            if( !Content )
            {
                console.log( 'no content', url.value );
                p.next( false );
                continue;
            }
            Content.Id = url.value;

            for( let i = 5; i--; )
            {
                try
                {
                    Result = await this.LLM.Check( Content );
                    p.next( Result.match );
                    break;
                }
                catch( e )
                {
                    console.log( 'Start', i, e );
                    if( Result )
                    {
                        Result.summary = '';
                        Result.keywords = [];
                    }
                }
            }
        }
        console.log( 'over.' );
    }

    Continue( max )
    {
        this.Site.LoadStartAt();
        this.Start( max );
    }
}

window.Tr = new Translator();
window.R = new LLMReader( Site0, GeminiPro );
} )();


