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
            }
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
    }

    *GenURLs()
    {
        this.LastRead = localStorage.getItem( 'KrLast' );
        for( let item of this.Document.querySelectorAll( '.information-flow-item' ))
        {
            let TpcA = item.querySelector( 'p.title-wrapper>a' );
            let LabelDom = item.querySelector( 'span.kr-flow-bar-motif>a' );

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

            if( --this.Max < 0 )
            {
                break;
            }

            this.DoneURLs.push( TpcA.href );

            let Rslt = yield TpcA.href;
            if( Rslt.summary )
            {
                if( !Rslt.fit )
                {
                    item.querySelector( 'div.kr-flow-article-item' ).style.backgroundColor = '#eee';
                    item.querySelector( 'p.title-wrapper>a' ).style.fontSize = '16px';
                }
                else
                {
                    if( Rslt.fit.toLowerCase().includes( 'blockchain' ))
                    {
                        Rslt.summary += "<a href='https://github.com/saintthor/decentralization' target='_blank'>原子物权链</a>是极致去中心化的区块链，将颠覆现有区块链技术。"
                    }
                    this.SummaryDom.innerHTML += '<br>' + Rslt.fit + '<br>' + Rslt.summary;
                }

                let Summary = document.createElement( "div" );
                Summary.innerHTML = '<div>' + !!Rslt.fit + '&ensp;' + Rslt.novelty + '</div>' + Rslt.summary;
                item.parentNode.insertBefore( Summary, item.nextSibling );
                console.log( 'add summary:', TpcA.href );
            }

            if( TpcA.href == this.LastRead )
            {
                let HRs = document.createElement( "div" );
                HRs.innerHTML = '<hr><hr><hr>';
                item.parentNode.insertBefore( HRs, item );
                console.log( 'finished:', TpcA.href );
                if( this.DoneURLs.length > 0 )
                {
                    localStorage.setItem( 'KrLast', this.DoneURLs[0] );
                }
                localStorage.setItem( 'KrStartAt', '' );
                return;
            }
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
        this.Prompt = ["You are my press secretary. I will send you an article. Please read through it and write two different summaries in Chinese (each around 200 words) about the article content. Then check the summaries, make sure the language is Chinese and measure fluency, and pick the better one.",
        "Determine if the summary interests me. Return the results in one JSON format including the following five keys:",
        "fit - String. If the topic of the article is about fashion, clothing, traditional industries, stock prices, corporate values, financing or personnel changes, it should be excluded and set to a blank string. Else if the article's spirit matches any of the fields listed bellow, set the value to the matched fields. Else set to a blank string.",
        "novelty - A number between 0-9. set to a high value if you have never seen it.",
        "summary - The better summary.",
        "worsummary - The worse summary.",
        "id - the Id in the input data.",
        "I am interested in content covering these fields:",
        "1. Blockchain/cryptocurrency.",
        "2. AI/LLM",
        "3. New advances in natural sciences, mathematics, psychology, economics, robots, computer science and various technologies.",
        "4. New business ideas never seen before based on new technologies in the internet space.",
        "5. Quantitative finance and trading rules.",
        "The article is:\n"].join( '\n' );
    }

    Check() {}
    Ask() {}
}

class GeminiPro extends BaseLLM
{
    constructor()
    {
        super();
        this.APIKey = localStorage.getItem( 'GeminiK' );
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

    async Receive()
    {
        console.log( 'Receive', this.Request );
        if( !this.Request )
        {
            return '';
        }
        const result = await this.Request;
        const response = await result.response;
        this.Request = null;
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
        article.text = article.text.slice( 0, 9999 );
        this.Request = this.Model.generateContent( this.Prompt + '\n\n' + JSON.stringify( article ));
        this.ReqTime = new Date().getTime();
        return await this.Receive();
    }

    async Ask( question )
    {
        console.log( 'Ask', question );
        let TimeDiff = 1200 - new Date().getTime() + this.ReqTime;
        if( TimeDiff > 0 )
        {
            await new Promise( r => setTimeout( r, TimeDiff ));
        }
        this.Request = this.Model.generateContent( question );
        this.ReqTime = new Date().getTime();
        return await this.Receive();
    }
}

class LLMReader
{
    constructor( siteCls, llmCls )
    {
        this.Site = new siteCls();
        this.LLM = new llmCls();
    }

    async Start( max )
    {
        let u = this.Site.GenURLs();
        let Result = null;
        if( max )
        {
            this.Site.Max = max;
        }

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
            let RsltJ = await this.LLM.Check( Content );

            try
            {
                let match = /{(.+)}/.exec( RsltJ.replace( /\n/g, '' ));
                if( match )
                {
                    RsltJ = match[0];
                }
                Result = JSON.parse( RsltJ );
                console.log( 'good format', Result );
                p.next( Result.fit );
            }
            catch( e )
            {
                console.log( 'wrong format:', e, RsltJ );
                Result = { 'summary': 'wrong format:' };
            }
        }
        console.log( 'over.' );
    }

    Continue( max )
    {
        if( max )
        {
            this.Site.Max = max;
        }
        this.Site.LoadStartAt();
        this.Start();
    }
}

window.R = new LLMReader( Site0, GeminiPro );

console.log( 'To pre-read the articles, you may run:\nR.Start();\nR.Continue();\nTo ask the LLM, you may run:\nR.Ask( "..." );' );
} )();

