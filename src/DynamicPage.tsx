import React, { useEffect, useState } from 'react';
import axios from 'axios';

const DynamicPage: React.FC<any> = (props) => {
  const [pageContent, setPageContent] = useState('');
  const [signedUrl, setSignedUrl] = useState('');

  const injectScripts = (htmlContent: any) => {
    const doc = new DOMParser().parseFromString(htmlContent, 'text/html');
    const scripts = doc.querySelectorAll('script');

    scripts.forEach((script) => {
      const newScript = document.createElement('script');
      newScript.text = script.text;
      document.head.appendChild(newScript);
    });

    setPageContent(doc.documentElement.outerHTML);
  };

  const blobToBase64 = (blob: any) => {
    const reader = new FileReader();
    reader.readAsDataURL(blob);
    return new Promise((resolve) => {
      reader.onloadend = () => {
        resolve(reader.result);
      };
    });
  };

  const loadExternalResources = async () => {
    const doc = new DOMParser().parseFromString(pageContent, 'text/html');
    const promises: any[] = [];

    // Load external stylesheets
    const linkElements = doc.querySelectorAll('link[rel="stylesheet"]');
    linkElements.forEach((link) => {
      const href = link.getAttribute('href');
      if (href && href.length > 0) {
        if (href.indexOf('http') === 0) {
          promises.push(fetch(href).then((response) => response.text()));
        } else if (href.indexOf('data:text/css;base64') < 0) {
          promises.push(fetch(`${signedUrl}${href}`).then((response) => response.text()));
        }
      }
    });

    // Load external images
    const imgElements = doc.querySelectorAll('img, source');
    imgElements.forEach((img) => {
      const src = img.getAttribute('src');
      if (src && src.length > 0) {
        if (src.indexOf('http') === 0) {
          promises.push(fetch(src).then((response) => response.blob()));
        } else if (src.indexOf(';base64') < 0) {
          promises.push(
            fetch(`${signedUrl}${src}`)
              .then((response) => response.blob())
              .then(blobToBase64),
          );
        }
      } else {
        const srcset = img.getAttribute('srcset');
        if (srcset && srcset.length > 0) {
          if (srcset.indexOf('http') === 0) {
            promises.push(fetch(srcset).then((response) => response.blob()));
          } else if (srcset.indexOf(';base64') < 0) {
            promises.push(
              fetch(`${signedUrl}${srcset}`)
                .then((response) => response.blob())
                .then(blobToBase64),
            );
          }
        }
      }
    });

    // Wait for all promises to resolve
    const results = await Promise.all(promises);

    if (results.length > 0) {
      // Replace external stylesheets with the loaded content
      linkElements.forEach((link, index) => {
        link.setAttribute('href', `data:text/css;base64,${btoa(results[index])}`);
      });
    }

    let imageResults = results;
    if (linkElements.length > 0 && results.length > 0) {
      imageResults = results.slice(linkElements.length);
    }

    if (imageResults.length > 0) {
      // Replace external images with base64-encoded data
      imgElements.forEach((img, index) => {
        const src = img.getAttribute('src');

        if (src && src.length > 0) {
          img.setAttribute('src', imageResults[index]);
        } else {
          const srcset = img.getAttribute('srcset');

          if (srcset && srcset.length > 0) {
            img.setAttribute('srcset', imageResults[index]);
          }
        }
      });
    }

    setPageContent(doc.documentElement.outerHTML);
  };

  useEffect(() => {
    if (pageContent) {
      loadExternalResources();
    }
  }, [pageContent]);

  useEffect(() => {
    const fetchWebPage = async () => {
      try {
        // The url should not ending with '/' because it will concate with
        // its resources for fetching and loading to the main web page
        const url = 'https://www.xpressflower.com';
        setSignedUrl(url);
        const fileRes = await axios.get(url);
        if (fileRes.status === 200) {
          const content = fileRes.data;
          setPageContent(content);
          // injectScripts(content);
        } else {
          console.error('Failed to fetch web page:', fileRes.status, fileRes.statusText);
        }
      } catch (error: any) {
        console.error('Error fetching web page:', error.message);
      }
    };

    fetchWebPage();
  }, []);

  return (
    <div>
      <div dangerouslySetInnerHTML={{ __html: pageContent }} />
      {/* <iframe
        width={'100%'}
        style={{ minHeight: '100vh' }}
        frameBorder={0}
        allowFullScreen={true}
        src='https://www.xpressflower.com'
      /> */}
    </div>
  );
};

export default DynamicPage;
