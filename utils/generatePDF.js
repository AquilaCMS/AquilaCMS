const wkhtmltopdf = require('wkhtmltopdf');

const WK_Wrapper = async (content, options) => new Promise((resolve, reject) => {
    const res = wkhtmltopdf(content, options, function (err) {
        if (err)  {
            reject(err);
        }
    });
    resolve(res);
});

const streamToBuffer = (streamObjectToRead) => {
    const chunks = [];
    return new Promise((resolve, reject) => {
        streamObjectToRead
            .on('data', (chunk) => chunks.push(chunk))
            .on('end', () => resolve(Buffer.concat(chunks)))
            .on('error', (err) => reject(err));
    });
};

/*
this function can return :
- a stream of the pdf
- a stream failed if wkhtmltopdf is not installed
- a buffer (if options stream to false)
- a string 'WK-HTML-TO-PDF_NOT_INSTALLED' if (if options stream to false) && wkhtmltopdf not installed
- null if error/ wkhtmltopdf failed

this function can throw an uncaughtException if wkhtmltopdf is not installed (but in Aquila, uncaughtException are catch)
to detect the output you can use
-----------------------
    const stream       = require('stream');
    const response = await useWkHTMLtoPDF(content, options);
    if (response instanceof stream.Readable) {
        a stream but can be fake if khmltopdf is not installed
    } if (Buffer.isBuffer(response)) {
        a working buffer
    }else if(typeof response === 'string'){
        wk not installed
    }else if(response === null){
        wk error
    }
-----------------------
*/
const useWkHTMLtoPDF = async (content = '', options = {}, stream = true) => {
    const isDebug = global?.envFile?.devMode?.wkhtmltopdf_debug === true;
    if (isDebug === true) {
        console.info('development mode => using wkhtmltopdf with debug options');
        options = {
            ...options,
            debug           : true,
            debugJavascript : true
        };
    }
    let resOfWK = null;
    try {
        resOfWK = await WK_Wrapper(content, options);
    } catch (error) {
        if (error && error.message) {
            console.error('wkhtmltopdf produced an error');
            if (isDebug) {
                console.error('(already printed in debug)');
            } else {
                const textError = `${error.message.replace('\n', '')}\n`;
                console.error(textError);
            }
        }
        return null;
    }
    if (resOfWK) {
        if (stream) {
            return resOfWK;
        }
        try {
            const buffer = await streamToBuffer(resOfWK);
            return buffer;
        } catch (errorBuffer) {
            if (errorBuffer && errorBuffer.message && errorBuffer.message === 'Error: write EPIPE') {
                return 'WK-HTML-TO-PDF_NOT_INSTALLED';
            }
            return null;
        }
    }
};

module.exports = {
    useWkHTMLtoPDF
};
