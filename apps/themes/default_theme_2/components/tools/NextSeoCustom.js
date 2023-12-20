import Head              from 'next/head';
import { NextSeo }       from 'next-seo';
import { useSiteConfig } from '@lib/hooks';

export default function NextSeoCustom({ noindex, title, description, canonical, image, lang }) {
    const { environment } = useSiteConfig();
    return (
        <>
            {
                environment?.demoMode && (
                    <Head>
                        <style>
                            {`
                                body::before {
                                    content: "/!\\\\ DEMO MODE /!\\\\";
                                    background-color: red;
                                    color: #000;
                                    padding: 2px;
                                    width: 100%;
                                    text-align: center;
                                    position: fixed;
                                    z-index: 99999;
                                    font-size: 11px;
                                }
                            `}
                        </style>
                    </Head>
                )
            }

            <NextSeo
                noindex={noindex || environment?.demoMode}
                nofollow={noindex || environment?.demoMode}
                title={title}
                description={description}
                canonical={canonical}
                openGraph={{
                    url        : canonical,
                    title      : title,
                    description: description,
                    locale     : lang,
                    images     : [
                        {
                            url: image,
                            alt: title,
                        }
                    ],
                }}
            />
        </>
    );
}