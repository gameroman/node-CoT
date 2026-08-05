import assert from 'node:assert/strict';
import test from 'node:test';
import MilSymType, { StandardIdentity } from '../lib/utils/2525.js';

test('2525 StandardIdentity', () => {
    assert.equal(
        MilSymType.standardIdentity('b-f-D'),
        StandardIdentity.NONE
    );

    assert.equal(
        MilSymType.standardIdentity('a-'),
        StandardIdentity.NONE
    );

    assert.equal(
        MilSymType.standardIdentity('a-x-D-H'),
        StandardIdentity.NONE
    );

    assert.equal(
        MilSymType.standardIdentity('a-h-S'),
        StandardIdentity.HOSTILE
    );
});

test('2525 <=> SIDC to2525B', () => {
    assert.equal("SHSPCLDD-------", MilSymType.to2525B("a-h-S-C-L-D-D"))
    assert.equal("SFGPUCVRA------", MilSymType.to2525B("a-f-G-U-C-V-R-A"))

    assert.throws(() => {
        MilSymType.to2525B("b-h-S-C-L-D-D")
    }, /CoT to 2525B can only be applied to well-formed Atom type CoT Events./);

    assert.throws(() => {
        MilSymType.to2525B("")
    }, /CoT to 2525B can only be applied to well-formed Atom type CoT Events./);

    assert.throws(() => {
        MilSymType.to2525B("bhSCLDD")
    }, /CoT to 2525B can only be applied to well-formed Atom type CoT Events./);

    assert.throws(() => {
        MilSymType.to2525B("b-h-s-c-l-d-d")
    }, /CoT to 2525B can only be applied to well-formed Atom type CoT Events./);

    assert.throws(() => {
        MilSymType.to2525B("b-h-S-?-L-D-D")
    }, /CoT to 2525B can only be applied to well-formed Atom type CoT Events./);
});

test('2525 <=> SIDC from2525B', () => {

    assert.equal("a-h-S-C-L-D-D", MilSymType.from2525B("SHSPCLDD-------"))
    assert.equal("a-f-G-U-C-V-R-A", MilSymType.from2525B("SFGPUCVRA------"))

    assert.throws(() => {
        MilSymType.from2525B("SFGPUCVRA")
    }, /2525B to CoT can only be applied to well-formed warfighting 2525B SIDCs./);

    assert.throws(() => {
        MilSymType.from2525B("SOGPUCVRA------")
    }, /2525B to CoT can only be applied to well-formed warfighting 2525B SIDCs./);

    assert.throws(() => {
        MilSymType.from2525B("SFMPUCVRA------")
    }, /2525B to CoT can only be applied to well-formed warfighting 2525B SIDCs./);

    assert.throws(() => {
        MilSymType.from2525B("SFMPUCVRA------")
    }, /2525B to CoT can only be applied to well-formed warfighting 2525B SIDCs./);

    assert.throws(() => {
        MilSymType.from2525B("SFGP*CVRA------")
    }, /2525B to CoT can only be applied to well-formed warfighting 2525B SIDCs./);

    assert.throws(() => {
        MilSymType.from2525B("GFGPUCVRA------")
    }, /2525B to CoT can only be applied to well-formed warfighting 2525B SIDCs./);
})

test('2525 <=> SIDC isNumericSIDCConvertable', () => {
    assert.equal(MilSymType.isNumericSIDCConvertable('10031000001211000000'), true);
    assert.equal(MilSymType.isNumericSIDCConvertable('13061500000000000000'), true);
    assert.equal(MilSymType.isNumericSIDCConvertable('12041000000000000000'), true);

    assert.equal(MilSymType.isNumericSIDCConvertable('a-f-G'), false);
    assert.equal(MilSymType.isNumericSIDCConvertable('SFGPUCVRA------'), false);
    assert.equal(MilSymType.isNumericSIDCConvertable('1003100000121100000'), false);
    assert.equal(MilSymType.isNumericSIDCConvertable('100310000012110000000'), false);
    assert.equal(MilSymType.isNumericSIDCConvertable('20031000001211000000'), false);
    assert.equal(MilSymType.isNumericSIDCConvertable(''), false);
});

test('2525 <=> SIDC fromNumericSIDC', () => {
    // 2525D - Friend Land Unit
    assert.equal(MilSymType.fromNumericSIDC('10031000001211000000'), 'a-f-G');

    // 2525E - Hostile Land Equipment
    assert.equal(MilSymType.fromNumericSIDC('13061500000000000000'), 'a-h-G');

    // Neutral Land Unit (round trip of MilIcon augmentation short code)
    assert.equal(MilSymType.fromNumericSIDC('10041000000000000000'), 'a-n-G');

    // Legacy augmentation short codes used an undefined "12" Version field
    assert.equal(MilSymType.fromNumericSIDC('12041000000000000000'), 'a-n-G');

    // Unknown Air
    assert.equal(MilSymType.fromNumericSIDC('13010100000000000000'), 'a-u-A');

    // Suspect Sea Surface
    assert.equal(MilSymType.fromNumericSIDC('10053000000000000000'), 'a-s-S');

    // Assumed Friend Sea Subsurface
    assert.equal(MilSymType.fromNumericSIDC('10023500000000000000'), 'a-a-U');

    // Exercise Friend Space
    assert.equal(MilSymType.fromNumericSIDC('10130500000000000000'), 'a-f-P');

    // Joker Land Unit
    assert.equal(MilSymType.fromNumericSIDC('10151000000000000000'), 'a-j-G');

    // Unmapped Identity/Symbol Set fall back to Unknown Ground
    assert.equal(MilSymType.fromNumericSIDC('10092500000000000000'), 'a-u-G');

    assert.throws(() => {
        MilSymType.fromNumericSIDC('a-f-G');
    }, /Numeric SIDC to CoT can only be applied to well-formed 2525D\/2525E SIDCs./);

    assert.throws(() => {
        MilSymType.fromNumericSIDC('SFGPUCVRA------');
    }, /Numeric SIDC to CoT can only be applied to well-formed 2525D\/2525E SIDCs./);
});

test('2525 <=> SIDC to2525D uses a defined Version field', () => {
    // Short codes (no Function ID) are built by hand rather than converted - they
    // must still declare the 2525D Version ("10") or Clients will fail to map the
    // SIDC to a symbology provider and render no symbol at all
    assert.equal(MilSymType.to2525D('a-f-G'), '10031000000000000000');
    assert.equal(MilSymType.to2525D('a-n-G'), '10041000000000000000');
    assert.equal(MilSymType.to2525D('a-u-A'), '10010100000000000000');

    // Converted codes are unchanged
    assert.equal(MilSymType.to2525D('a-f-G-E-V-C'), '10031500001601000000');
    assert.equal(MilSymType.to2525D('a-h-S-C-L-D-D'), '10063000001202030000');
});

test('2525 <=> SIDC cotTypeFromNumericSIDC', () => {
    // 2525D - Friend Land Unit Infantry
    assert.equal(MilSymType.cotTypeFromNumericSIDC('10031000001211000000'), 'a-f-G-U-C-I');

    // 2525E - the same symbol, Function ID preserved across variants
    assert.equal(MilSymType.cotTypeFromNumericSIDC('13031000001211000000'), 'a-f-G-U-C-I');

    // Unknown Land Equipment
    assert.equal(MilSymType.cotTypeFromNumericSIDC('10011500001103000000'), 'a-u-G-E-W-Z');

    // Friend Air Military Fixed Wing
    assert.equal(MilSymType.cotTypeFromNumericSIDC('10030100001101000000'), 'a-f-A-M-F');

    // No Entity - basic type is all the SIDC carries
    assert.equal(MilSymType.cotTypeFromNumericSIDC('10031000000000000000'), 'a-f-G');

    // 2525E Activities symbol set has no warfighting equivalent
    assert.equal(MilSymType.cotTypeFromNumericSIDC('13034000001101140000'), 'a-f-G');

    // Exercise & Joker identities can't round trip through 2525B, so the basic
    // type is kept rather than downgrading the identity to Friend
    assert.equal(MilSymType.cotTypeFromNumericSIDC('10130500000000000000'), 'a-f-P');
    assert.equal(MilSymType.cotTypeFromNumericSIDC('10151000000000000000'), 'a-j-G');

    // Unmapped Identity/Symbol Set fall back to Unknown Ground
    assert.equal(MilSymType.cotTypeFromNumericSIDC('10092500000000000000'), 'a-u-G');

    assert.throws(() => {
        MilSymType.cotTypeFromNumericSIDC('a-f-G');
    }, /Numeric SIDC to CoT can only be applied to well-formed 2525D\/2525E SIDCs./);
});
