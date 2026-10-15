<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="2.0" 
                xmlns:html="http://www.w3.org/TR/REC-html40"
                xmlns:sitemap="http://www.sitemaps.org/schemas/sitemap/0.9"
                xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
  <xsl:output method="html" version="1.0" encoding="UTF-8" indent="yes"/>
  <xsl:template match="/">
    <html xmlns="http://www.w3.org/1999/xhtml" lang="en">
      <head>
        <title>XML Sitemap — Nepal Weather &amp; River Watch Portal</title>
        <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <style type="text/css">
          * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen-Sans, Ubuntu, Cantarell, "Helvetica Neue", sans-serif;
            background-color: #f8fafc;
            color: #1e293b;
            padding: 2.5rem 1.5rem;
            line-height: 1.5;
          }
          .container {
            max-width: 80rem;
            margin: 0 auto;
            background: #ffffff;
            border-radius: 1rem;
            box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
            padding: 2.5rem;
            border: 1px solid #e2e8f0;
          }
          .badge {
            display: inline-block;
            font-size: 0.75rem;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            background: #2563eb;
            color: #ffffff;
            padding: 0.25rem 0.6rem;
            border-radius: 9999px;
            margin-bottom: 0.75rem;
          }
          h1 {
            font-size: 2rem;
            font-weight: 800;
            color: #0f172a;
            margin-bottom: 0.5rem;
          }
          p.lead {
            font-size: 1.05rem;
            color: #475569;
            margin-bottom: 1.5rem;
          }
          .count-banner {
            background-color: #eff6ff;
            border: 1px solid #bfdbfe;
            color: #1e40af;
            padding: 0.85rem 1.25rem;
            border-radius: 0.75rem;
            font-weight: 600;
            font-size: 0.95rem;
            margin-bottom: 1.75rem;
            display: flex;
            align-items: center;
            gap: 0.5rem;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 0.875rem;
          }
          th {
            text-align: left;
            padding: 0.85rem 1rem;
            background-color: #f1f5f9;
            color: #334155;
            font-weight: 700;
            border-bottom: 2px solid #cbd5e1;
          }
          td {
            padding: 0.75rem 1rem;
            border-bottom: 1px solid #e2e8f0;
            vertical-align: middle;
          }
          tr:nth-child(even) {
            background-color: #f8fafc;
          }
          tr:hover {
            background-color: #eff6ff;
          }
          a {
            color: #2563eb;
            text-decoration: none;
            word-break: break-all;
            font-weight: 500;
          }
          a:hover {
            color: #1d4ed8;
            text-decoration: underline;
          }
          .mono {
            font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
            color: #64748b;
            font-size: 0.825rem;
          }
          .footer {
            margin-top: 2rem;
            padding-top: 1.25rem;
            border-top: 1px solid #e2e8f0;
            font-size: 0.8rem;
            color: #64748b;
            display: flex;
            justify-content: space-between;
            align-items: center;
            flex-wrap: wrap;
            gap: 0.5rem;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="badge">XML Sitemap</div>
          <h1>Nepal Weather &amp; River Watch Portal</h1>
          <p class="lead">
            This XML Sitemap is structured for search engines (Google, Bing, Yahoo) and users to discover real-time hydrological surveillance and meteorological forecast pages across Nepal.
          </p>
          
          <!-- URL Set Case -->
          <xsl:if test="count(sitemap:urlset/sitemap:url) &gt; 0">
            <div class="count-banner">
              <span>This XML Sitemap contains <strong><xsl:value-of select="count(sitemap:urlset/sitemap:url)"/></strong> canonical indexed URLs.</span>
            </div>
            <table>
              <thead>
                <tr>
                  <th width="55%">URL Location</th>
                  <th width="12%">Priority</th>
                  <th width="15%">Change Freq</th>
                  <th width="18%">Last Modified</th>
                </tr>
              </thead>
              <tbody>
                <xsl:for-each select="sitemap:urlset/sitemap:url">
                  <tr>
                    <td>
                      <a href="{sitemap:loc}"><xsl:value-of select="sitemap:loc"/></a>
                    </td>
                    <td class="mono">
                      <xsl:value-of select="sitemap:priority"/>
                    </td>
                    <td class="mono">
                      <xsl:value-of select="sitemap:changefreq"/>
                    </td>
                    <td class="mono">
                      <xsl:value-of select="concat(substring(sitemap:lastmod,0,11),concat(' ', substring(sitemap:lastmod,12,5)))"/>
                    </td>
                  </tr>
                </xsl:for-each>
              </tbody>
            </table>
          </xsl:if>

          <div class="footer">
            <span>Official Meteorological &amp; Hydrological Feeds: DHM &amp; MFD Nepal</span>
            <span><a href="https://weather.topnepali.com">weather.topnepali.com</a></span>
          </div>
        </div>
      </body>
    </html>
  </xsl:template>
</xsl:stylesheet>
