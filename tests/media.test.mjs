import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import test from 'node:test';
import assert from 'node:assert/strict';
const source = await readFile(new URL('../assets/media.js', import.meta.url), 'utf8');
const photo = 'https://bdeajozhylypiidrldka.supabase.co/storage/v1/object/public/frankiholz-media/rooms/a photo.png';
function media(hostname) {
  const context = vm.createContext({URL, URLSearchParams, window: {}, location: {hostname, origin: 'https://' + hostname}});
  vm.runInContext(source, context);
  return context.window.FrankiHolzMedia;
}
test('approved uploads use bounded responsive Netlify transformations without changing originals', () => {
  const api = media('develop--frankiholz.netlify.app');
  const result = new URL(api.imageUrl(photo, 640), 'https://develop--frankiholz.netlify.app');
  assert.equal(result.pathname, '/.netlify/images');
  assert.equal(result.searchParams.get('url'), new URL(photo).href);
  assert.equal(result.searchParams.get('w'), '640');
  assert.equal(result.searchParams.get('fm'), 'webp');
  assert.match(api.srcset(photo, [320, 640]), /320w, .*640w$/);
  assert.equal(api.imageUrl(photo, 99999), photo);
});
test('local development and unapproved or credentialed URLs do not enter the image proxy', () => {
  assert.equal(media('127.0.0.1').imageUrl(photo, 640), photo);
  const api = media('stay.frankiflow.de');
  for (const url of ['https://other.invalid/a.png', photo + '?token=private', photo.replace('https://', 'https://user@'), photo.replace('frankiholz-media/', 'other-bucket/'), 'data:image/png;base64,AA']) {
    assert.equal(api.imageUrl(url, 640), url);
  }
});
test('image failure returns to original and removes responsive candidates once', () => {
  const removed = [], image = {dataset: {original: photo}, onerror() {}, getAttribute: () => '/.netlify/images?url=fixture', removeAttribute: name => removed.push(name)};
  media('stay.frankiflow.de').fallback(image);
  assert.equal(image.src, photo);
  assert.equal(image.onerror, null);
  assert.deepEqual(removed, ['srcset', 'sizes']);
});
