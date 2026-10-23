import {test} from 'node:test';
import assert from 'node:assert/strict';
import {contactNumber,mediaUrl,publicConfig} from '../lib/config.ts';

test('international support contacts are validated before creating outgoing links',()=>{
  assert.equal(contactNumber('+49 176 62493 041'),'+4917662493041');
  for(const invalid of ['local number','javascript:alert(1)','1234','+0 555 123 123','+1234567890123456'])assert.equal(contactNumber(invalid),'');
});
test('storage object paths cannot introduce query strings or fragments',()=>{
  assert.equal(mediaUrl('rooms/photo?token=guest#secret.jpg'),publicConfig().supabaseUrl+'/storage/v1/object/public/frankiholz-media/rooms/photo%3Ftoken%3Dguest%23secret.jpg');
  assert.equal(mediaUrl(null),'');
});
