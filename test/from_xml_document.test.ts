import assert from 'node:assert/strict';
import test from 'node:test';
import { CoTParser } from '../index.js';

type RawEvent = {
    _attributes?: Record<string, unknown>;
    detail?: { contact?: { _attributes?: Record<string, unknown> } };
};

const validEvent = (uid: string, callsign?: string): string => `
    <event version="2.0" uid="${uid}" type="a-f-G" time="2026-08-11T00:00:00.000Z" start="2026-08-11T00:00:00.000Z" stale="2026-08-11T00:05:00.000Z" how="h-g-i-g-o">
        <point lat="1.1" lon="2.2" hae="0.0" ce="9999999.0" le="9999999.0"/>
        <detail>${callsign ? `<contact callsign="${callsign}"/>` : ''}</detail>
    </event>
`;

test('CoTParser.from_xml_document - all valid events', () => {
    const { cots, invalid } = CoTParser.from_xml_document(`
        <events>
            ${validEvent('uid-1', 'ALPHA')}
            ${validEvent('uid-2')}
        </events>
    `);

    assert.equal(cots.length, 2);
    assert.equal(invalid.length, 0);
    assert.deepEqual(cots.map((cot) => cot.uid()), ['uid-1', 'uid-2']);
    assert.equal(cots[0].callsign(), 'ALPHA');
});

test('CoTParser.from_xml_document - single event document', () => {
    const { cots, invalid } = CoTParser.from_xml_document(`
        <events>
            ${validEvent('uid-1')}
        </events>
    `);

    assert.equal(cots.length, 1);
    assert.equal(invalid.length, 0);
    assert.equal(cots[0].uid(), 'uid-1');
});

test('CoTParser.from_xml_document - empty document', () => {
    const { cots, invalid } = CoTParser.from_xml_document('<events></events>');

    assert.equal(cots.length, 0);
    assert.equal(invalid.length, 0);
});

test('CoTParser.from_xml_document - poisoned event does not prevent valid events', () => {
    const { cots, invalid } = CoTParser.from_xml_document(`
        <events>
            ${validEvent('uid-1', 'ALPHA')}
            <event version="2.0" uid="uid-poisoned" type="a-f-G" time="2026-08-11T00:00:00.000Z" start="2026-08-11T00:00:00.000Z" stale="2026-08-11T00:05:00.000Z" how="h-g-i-g-o">
                <detail>
                    <contact callsign="BRAVO"/>
                </detail>
            </event>
            ${validEvent('uid-2')}
        </events>
    `);

    assert.equal(cots.length, 2);
    assert.deepEqual(cots.map((cot) => cot.uid()), ['uid-1', 'uid-2']);

    assert.equal(invalid.length, 1);
    assert.ok(invalid[0].error.length > 0);

    const event = invalid[0].event as RawEvent;
    assert.equal(event._attributes?.uid, 'uid-poisoned');
    assert.equal(event.detail?.contact?._attributes?.callsign, 'BRAVO');
});

test('CoTParser.from_xml_document - poisoned event is returned unmutated', () => {
    const { cots, invalid } = CoTParser.from_xml_document(`
        <events>
            <event version="2.0"></event>
            ${validEvent('uid-1')}
        </events>
    `);

    assert.equal(cots.length, 1);
    assert.equal(cots[0].uid(), 'uid-1');

    assert.equal(invalid.length, 1);
    assert.ok(invalid[0].error.length > 0);

    const event = invalid[0].event as RawEvent;
    assert.equal(event._attributes?.uid, undefined);
    assert.equal(event.detail, undefined);
});

test('CoTParser.from_xml_document - boolean string attributes are normalized', () => {
    const { cots, invalid } = CoTParser.from_xml_document(`
        <events>
            <event version="2.0" uid="uid-bool" type="u-d-f" time="2026-08-11T00:00:00.000Z" start="2026-08-11T00:00:00.000Z" stale="2026-08-11T00:05:00.000Z" how="h-g-i-g-o">
                <point lat="1.1" lon="2.2" hae="0.0" ce="9999999.0" le="9999999.0"/>
                <detail>
                    <labels_on value="true"/>
                </detail>
            </event>
        </events>
    `);

    assert.equal(invalid.length, 0);
    assert.equal(cots.length, 1);
    assert.equal(cots[0].raw.event.detail?.labels_on?._attributes?.value, true);
});

test('CoTParser.from_xml_document - XML declaration header is accepted', () => {
    const { cots, invalid } = CoTParser.from_xml_document(
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        + `<events>${validEvent('uid-1', 'ALPHA')}</events>`
    );

    assert.equal(invalid.length, 0);
    assert.equal(cots.length, 1);
    assert.equal(cots[0].uid(), 'uid-1');
    assert.equal(cots[0].callsign(), 'ALPHA');
});

test('CoTParser.from_xml_document - bare event document without an events wrapper', () => {
    const { cots, invalid } = CoTParser.from_xml_document(validEvent('uid-bare', 'ALPHA'));

    assert.equal(invalid.length, 0);
    assert.equal(cots.length, 1);
    assert.equal(cots[0].uid(), 'uid-bare');
});

test('CoTParser.from_xml_document - document with no event elements', () => {
    const { cots, invalid } = CoTParser.from_xml_document('<events>garbage but valid xml</events>');

    assert.equal(cots.length, 0);
    assert.equal(invalid.length, 0);
});

test('CoTParser.from_xml_document - all events invalid', () => {
    const { cots, invalid } = CoTParser.from_xml_document(`
        <events>
            <event version="2.0" uid="uid-poisoned-1"></event>
            <event version="2.0" uid="uid-poisoned-2"></event>
        </events>
    `);

    assert.equal(cots.length, 0);
    assert.equal(invalid.length, 2);
    assert.deepEqual(
        invalid.map((entry) => (entry.event as RawEvent)._attributes?.uid),
        ['uid-poisoned-1', 'uid-poisoned-2']
    );
});

test('CoTParser.from_xml_document - order is preserved with interleaved invalid events', () => {
    const { cots, invalid } = CoTParser.from_xml_document(`
        <events>
            <event version="2.0" uid="uid-poisoned-1"></event>
            ${validEvent('uid-1')}
            <event version="2.0" uid="uid-poisoned-2"></event>
            ${validEvent('uid-2')}
            ${validEvent('uid-3')}
        </events>
    `);

    assert.deepEqual(cots.map((cot) => cot.uid()), ['uid-1', 'uid-2', 'uid-3']);
    assert.deepEqual(
        invalid.map((entry) => (entry.event as RawEvent)._attributes?.uid),
        ['uid-poisoned-1', 'uid-poisoned-2']
    );
});

test('CoTParser.from_xml_document - validation errors are meaningful', () => {
    const { invalid } = CoTParser.from_xml_document(`
        <events>
            <event version="2.0" uid="uid-poisoned" type="a-f-G" time="2026-08-11T00:00:00.000Z" start="2026-08-11T00:00:00.000Z" stale="2026-08-11T00:05:00.000Z" how="h-g-i-g-o">
                <detail/>
            </event>
        </events>
    `);

    assert.equal(invalid.length, 1);
    assert.match(invalid[0].error, /point/);
});

test('CoTParser.from_xml_document - does not append Flow-Tags to parsed CoTs', () => {
    const { cots } = CoTParser.from_xml_document(`
        <events>${validEvent('uid-1')}</events>
    `);

    assert.equal(cots.length, 1);
    assert.equal(cots[0].raw.event.detail?.['_flow-tags_'], undefined);
});

test('CoTParser.from_xml_document - parsed CoTs convert to GeoJSON Features', async () => {
    const { cots, invalid } = CoTParser.from_xml_document(`
        <events>
            ${validEvent('uid-1', 'ALPHA')}
            <event version="2.0" uid="uid-poisoned"></event>
        </events>
    `);

    assert.equal(invalid.length, 1);
    assert.equal(cots.length, 1);

    const feat = await CoTParser.to_geojson(cots[0]);

    assert.equal(feat.id, 'uid-1');
    assert.equal(feat.properties.callsign, 'ALPHA');
    assert.equal(feat.properties.type, 'a-f-G');
    assert.equal(feat.geometry.type, 'Point');
    assert.deepEqual(feat.geometry.coordinates, [2.2, 1.1, 0]);
});

test('CoTParser.from_xml_document - invalid XML document throws', () => {
    assert.throws(() => {
        CoTParser.from_xml_document('this is not xml <events');
    });
});
