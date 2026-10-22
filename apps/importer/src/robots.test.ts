import { describe, expect, it } from 'vitest'

import { isAllowed, parseRobots } from './robots.ts'

function allowed(text: string, path: string, productToken = 'scHeerenveenFansite') {
  return isAllowed(parseRobots(text, productToken), new URL(path, 'https://example.com'))
}

describe('the groups of RFC 9309, section 2.2.1', () => {
  it('merges groups for the same product token, whatever the case', () => {
    const text = 'user-agent: ExampleBot\ndisallow: /foo\ndisallow: /bar\n\nUSER-AGENT: examplebot\nDisallow: /baz'

    expect(allowed(text, '/foo', 'ExampleBot')).toBe(false)
    expect(allowed(text, '/bar', 'ExampleBot')).toBe(false)
    expect(allowed(text, '/baz', 'ExampleBot')).toBe(false)
    expect(allowed(text, '/qux', 'ExampleBot')).toBe(true)
  })

  it('uses the group for * when no group names the product token', () => {
    const text = 'user-agent: *\ndisallow: /foo\ndisallow: /bar\n\nuser-agent: BazBot\ndisallow: /baz'

    expect(allowed(text, '/foo', 'ExampleBot')).toBe(false)
    expect(allowed(text, '/bar', 'ExampleBot')).toBe(false)
    expect(allowed(text, '/baz', 'ExampleBot')).toBe(true)
  })

  it('allows everything when no group applies', () => {
    expect(allowed('user-agent: BazBot\ndisallow: /', '/foo')).toBe(true)
    expect(allowed('', '/foo')).toBe(true)
  })

  it('prefers the group for the product token over the group for *', () => {
    const text = 'user-agent: *\ndisallow: /\n\nuser-agent: scHeerenveenFansite\ndisallow: /private/'

    expect(allowed(text, '/news')).toBe(true)
    expect(allowed(text, '/private/page')).toBe(false)
    expect(allowed(text, '/news', 'otherbot')).toBe(false)
  })

  it('does not take a longer user agent for the product token', () => {
    expect(allowed('user-agent: scHeerenveenFansiteExtra\ndisallow: /', '/news')).toBe(true)
  })

  it('ignores rules that are not in a group', () => {
    expect(allowed('disallow: /\n\nuser-agent: otherbot\ndisallow: /foo', '/news')).toBe(true)
  })
})

describe('the examples of RFC 9309, section 5', () => {
  const simple = [
    'User-Agent: *',
    'Disallow: *.gif$',
    'Disallow: /example/',
    'Allow: /publications/',
    '',
    'User-Agent: foobot',
    'Disallow:/',
    'Allow:/example/page.html',
    'Allow:/example/allowed.gif',
    '',
    'User-Agent: barbot',
    'User-Agent: bazbot',
    'Disallow: /example/page.html',
    '',
    'User-Agent: quxbot',
    '',
  ].join('\n')

  it('restricts every other crawler as the group for * says', () => {
    expect(allowed(simple, '/example/page.html', 'otherbot')).toBe(false)
    expect(allowed(simple, '/pictures/cat.gif', 'otherbot')).toBe(false)
    expect(allowed(simple, '/publications/report.html', 'otherbot')).toBe(true)
    expect(allowed(simple, '/publications/cover.gif', 'otherbot')).toBe(true)
    expect(allowed(simple, '/news', 'otherbot')).toBe(true)
  })

  it('gives foobot two paths', () => {
    expect(allowed(simple, '/example/page.html', 'foobot')).toBe(true)
    expect(allowed(simple, '/example/allowed.gif', 'foobot')).toBe(true)
    expect(allowed(simple, '/example/other.html', 'foobot')).toBe(false)
    expect(allowed(simple, '/news', 'foobot')).toBe(false)
  })

  it('applies one group to barbot and bazbot', () => {
    for (const bot of ['barbot', 'bazbot']) {
      expect(allowed(simple, '/example/page.html', bot)).toBe(false)
      expect(allowed(simple, '/example/other.html', bot)).toBe(true)
      expect(allowed(simple, '/news', bot)).toBe(true)
    }
  })

  it('gives quxbot an empty group, which allows everything and does not fall back to *', () => {
    expect(allowed(simple, '/example/page.html', 'quxbot')).toBe(true)
    expect(allowed(simple, '/pictures/cat.gif', 'quxbot')).toBe(true)
  })

  it('lets the longest rule win', () => {
    const text = 'User-Agent: foobot\nAllow: /example/page/\nDisallow: /example/page/disallowed.gif'

    expect(allowed(text, '/example/page/disallowed.gif', 'foobot')).toBe(false)
    expect(allowed(text, '/example/page/allowed.gif', 'foobot')).toBe(true)
  })
})

describe('the special characters of RFC 9309, section 2.2.3', () => {
  it('ends a pattern at the end of the path with $', () => {
    const text = 'user-agent: *\ndisallow: /this/path/exactly$'

    expect(allowed(text, '/this/path/exactly')).toBe(false)
    expect(allowed(text, '/this/path/exactly/more')).toBe(true)
    expect(allowed(text, '/this/path/exactly?x=1')).toBe(true)
  })

  it('takes * for any run of characters, a slash included', () => {
    const text = 'user-agent: *\nallow: /this/*/exactly\ndisallow: /'

    expect(allowed(text, '/this/path/exactly')).toBe(true)
    expect(allowed(text, '/this/very/long/path/exactly')).toBe(true)
    expect(allowed(text, '/this//exactly')).toBe(true)
    expect(allowed(text, '/this/exactly')).toBe(false)
  })

  it('reads a comment as the end of a line', () => {
    const text = '# the rules\nuser-agent: * # everyone\ndisallow: /private # keep out\n'

    expect(allowed(text, '/private/page')).toBe(false)
    expect(allowed(text, '/news')).toBe(true)
  })

  it('matches the query as part of the path', () => {
    const text = 'user-agent: *\ndisallow: /*.php$'

    expect(allowed(text, '/index.php')).toBe(false)
    expect(allowed(text, '/index.php?page=2')).toBe(true)
    expect(allowed('user-agent: *\ndisallow: /search?q=', '/search?q=heerenveen')).toBe(false)
  })

  it('matches a * or $ in the URL only with its percent-encoded form in the rule', () => {
    expect(allowed('user-agent: *\ndisallow: /path/file-with-a-%2A.html', '/path/file-with-a-*.html')).toBe(false)
    expect(allowed('user-agent: *\ndisallow: /path/foo-%24', '/path/foo-$')).toBe(false)
    expect(allowed('user-agent: *\ndisallow: /path/foo-%24', '/path/foo-bar')).toBe(true)
  })
})

describe('the percent-encoding of RFC 9309, section 2.2.2', () => {
  it('compares the query as written', () => {
    expect(allowed('user-agent: *\ndisallow: /foo/bar?baz=quz', '/foo/bar?baz=quz')).toBe(false)
  })

  it('matches a rule with a character outside ASCII to the URL with its percent-encoded form', () => {
    expect(allowed('user-agent: *\ndisallow: /foo/bar/ツ', '/foo/bar/%E3%83%84')).toBe(false)
    expect(allowed('user-agent: *\ndisallow: /foo/bar/ツ', '/foo/bar/ツ')).toBe(false)
    expect(allowed('user-agent: *\ndisallow: /foo/bar/%E3%83%84', '/foo/bar/%E3%83%84')).toBe(false)
    expect(allowed('user-agent: *\ndisallow: /foo/bar/%e3%83%84', '/foo/bar/%E3%83%84')).toBe(false)
  })

  it('decodes a percent-encoded unreserved character before comparing', () => {
    expect(allowed('user-agent: *\ndisallow: /foo/bar/%62%61%7A', '/foo/bar/baz')).toBe(false)
    expect(allowed('user-agent: *\ndisallow: /foo/bar/baz', '/foo/bar/%62%61%7A')).toBe(false)
  })

  it('keeps a percent-encoded reserved character as it is', () => {
    expect(allowed('user-agent: *\ndisallow: /foo%2Fbar', '/foo/bar')).toBe(true)
    expect(allowed('user-agent: *\ndisallow: /foo%2Fbar', '/foo%2Fbar')).toBe(false)
  })
})

describe('robots.txt as sites write it', () => {
  it('lets Allow win when a rule is as long as the Disallow it meets', () => {
    expect(allowed('user-agent: *\ndisallow: /page\nallow: /page', '/page')).toBe(true)
    expect(allowed('user-agent: *\nallow: /page\ndisallow: /page', '/page')).toBe(true)
  })

  it('allows everything after an empty Disallow', () => {
    expect(allowed('user-agent: *\ndisallow:', '/anything')).toBe(true)
  })

  it('does not let other lines end a group', () => {
    const text =
      'user-agent: *\nsitemap: https://example.com/sitemap.xml\ncrawl-delay: 10\nhost: example.com\ndisallow: /x'

    expect(allowed(text, '/x')).toBe(false)
  })

  it('joins user-agent lines with empty lines and comments between them', () => {
    const text = 'user-agent: otherbot\n\n# a comment\nuser-agent: scHeerenveenFansite\ndisallow: /x'

    expect(allowed(text, '/x')).toBe(false)
  })

  it('reads a byte order mark, and CRLF and CR line endings', () => {
    expect(allowed('\uFEFFuser-agent: *\r\ndisallow: /x\r\n', '/x')).toBe(false)
    expect(allowed('user-agent: *\rdisallow: /x\r', '/x')).toBe(false)
  })

  it('ignores lines it can not read', () => {
    const text = 'user-agent: *\nthis is not a rule\ndisallow /nocolon\ndisallow: private/\ndisallow: /x'

    expect(allowed(text, '/x')).toBe(false)
    expect(allowed(text, '/private/page')).toBe(true)
    expect(allowed(text, '/nocolon')).toBe(true)
  })

  it('always allows /robots.txt itself', () => {
    expect(allowed('user-agent: *\ndisallow: /', '/robots.txt')).toBe(true)
  })

  it('stays fast on a pattern with many stars', () => {
    const text = `user-agent: *\ndisallow: /${'*a'.repeat(40)}b`

    expect(allowed(text, `/${'a'.repeat(5000)}`)).toBe(true)
  })
})
