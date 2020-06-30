import React from 'react';

export default function Custom404() {
    return (
        <html>
            <head>
                <meta name="robots" content="noindex,nofollow,noarchive" />
                <title>404 - Page Not Found</title>
            
                <style>{`
                    body {margin: 0;padding: 0;}
                    .notfound {
                        padding: 20px 10%;
                        margin-top:20%;
                        background: #576fa1;
                    }
                    .notfound > span {
                        margin-top:30px;
                        color:#AAA;
                        font-size: 30px;
                        float: right;
                    }
                `}
                </style>
            </head>
            
            <body>
                <div className="notfound">
                  <a href="/">
                      <img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAQ4AAABaCAMAAAB+B0jCAAACN1BMVEVMaXH////u6vH///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////9Xb6H////8t1bwVCP8tVL8tU/8skb8t1P4qRr6q0FXb6D8uEz8uFD9tR39t0b9tyr9uDX4mE75pEz9uD5hcpv1g0H8s0v0fDrzcCv1iUZddaX2jEn8sDvzdzP8rzXa4Ov8sitacJ7yYCLyaSP2kk39tRb4oFB4eo34m1L8sUFoc5b6+vzwVyJvdpH4n0b2jkzq7PNmfKr3k0+WhW5xhbC7k1KBf4mGf4H5ojv6rCPYpmPwrUydq8jGzt/Qnlftr1ujjnq2lm+UhIB/kbi6w9j+9PDxqTmSocKqjGDmoiv6pS7jlVbKmWPjpknwpSGKm76rt9DHmEXzbD3kfUezgm71xKzHX0T0jWX5xLLXnTfuXi771cHsmk18a4PUg1rseFD83NL3rJGVcXj1lFu+op28mp8v3ayBAAAAV3RSTlMA/gEXJvQG+XT82KRotxrkWUXtn60LTi/XzxCFlN01vn3EmcpXQBXRYG83H1KNESrgIGVDXggBOxl6jp549ajn1puDEgQthhzzVq/BpViLNA0orHaiarokfnr5AAAMG0lEQVR42u2ciV8bxxXHVzI6kTh0gkAIcchgjMFgGzuX0zhN06ZJerMujrHSy+26tokdIietgqhsiJBwOcRlMITLOD7wfaT94/pmdqW9ZnfBhY/bxd/PxwZ2R9LMb9578+bQUq94xX/Hwf31jsoPjr5JI948+kGlo37/QWpnsm9PGU2ibM8+aqdx8IdvsY1/pQhF1XF20T/Qe21sZrCnE4j2DM6MXesd6OcUqaN2CO8eYVvci5UQgzTp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"></img>
                  </a>
                  <span>404 - Page non trouvée</span>
                </div>
            </body>
        </html>
    )
  }