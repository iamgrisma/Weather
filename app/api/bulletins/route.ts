import { NextResponse } from 'next/server';
import { RADAR_FEEDS, EPHEMERIS_DATA } from '@/lib/dhm-data';

export async function GET() {
  const now = new Date();
  
  // Dynamically generate dates for Day 1, Day 2, Day 3
  const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  
  const formatDate = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const formatDisplay = (d: Date, dayNum: number) => `${formatDate(d)} (Day ${dayNum})`;

  const d1 = new Date(now);
  const d2 = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const d3 = new Date(now.getTime() + 48 * 60 * 60 * 1000);

  const dynamicThreeDayOutlook = [
    {
      dayNumber: 1,
      date: formatDisplay(d1, 1),
      isoDate: formatDate(d1),
      dayEn: daysOfWeek[d1.getDay()],
      weatherPatternEn: 'Partly to generally cloudy in Koshi, Gandaki, and Bagmati provinces with light to moderate showers in the hilly areas. Mainly fair across Terai flatlands.',
      weatherPatternNp: 'कोशी, गण्डकी र बागमती प्रदेशमा आंशिक देखि साधारणतया बदली, पहाडी भेगमा मेघगर्जन सहित हल्का देखि मध्यम वर्षा।',
      hazardAlertEn: 'Watch for localized rain-induced slope saturation in Mid-Hills and high river discharges in Budhigandaki catchment.',
      hazardAlertNp: 'बुढीगण्डकी तथा सहायक नदी क्षेत्रमा उच्च जलसतह सम्बन्धी सतर्कता।',
      rainProbability: 45,
      temperatureTrend: 'Normal daytime highs',
    },
    {
      dayNumber: 2,
      date: formatDisplay(d2, 2),
      isoDate: formatDate(d2),
      dayEn: daysOfWeek[d2.getDay()],
      weatherPatternEn: 'Mainly fair throughout the country with occasional cloud patches over the Eastern Himalayas. Stable post-monsoon northerly winds picking up.',
      weatherPatternNp: 'देशभर मुख्यतया मौसम सफा रहनेछ। पूर्वी हिमाली क्षेत्रमा आंशिक बदली।',
      hazardAlertEn: 'Nighttime radiative cooling leading to sub-zero alpine temperatures above 4,000m. Frost advisory for high passes.',
      hazardAlertNp: 'उच्च हिमाली क्षेत्रमा राती अत्यधिक चिसो र तुषारोको सम्भावना।',
      rainProbability: 20,
      temperatureTrend: 'Slight cooling trend at night',
    },
    {
      dayNumber: 3,
      date: formatDisplay(d3, 3),
      isoDate: formatDate(d3),
      dayEn: daysOfWeek[d3.getDay()],
      weatherPatternEn: 'Predominantly clear conditions nationwide. Strong jet stream winds aloft across Everest and Kanchenjunga summit ridges.',
      weatherPatternNp: 'देशभर सामान्यतया मौसम सफा। सगरमाथा तथा कञ्चनजङ्घा चुचुरोमा तीव्र पश्चिमी वायु।',
      hazardAlertEn: 'Optimal weather window for low-elevation trekking and flights; high mountaineering expeditions must prepare for 45+ knot summit winds.',
      hazardAlertNp: 'पर्यटन तथा उडानका लागि अनुकूल मौसम। उच्च आरोहणमा तीव्र हावाको सतर्कता।',
      rainProbability: 10,
      temperatureTrend: 'Sunny daytime, clear cold nights',
    },
  ];

  const dynamicBulletin = {
    bulletinId: `MFD-SYN-${formatDate(d1)}-01`,
    issueDate: now.toISOString(),
    issueTimeLocal: `${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} NST`,
    validUntil: new Date(now.getTime() + 72 * 60 * 60 * 1000).toISOString(),
    currentConditionSummary: 'Post-Monsoon Transition with Western Trough Influence',
    synopsisEn: 'A high pressure ridge prevails across Western Nepal while localized moisture convergence affects Gandaki and Koshi river basins. Convective rain cells active over Annapurna and Manaslu foothills.',
    synopsisNp: 'नेपालमा हाल पश्चिमी वायु तथा स्थानीय वायुको आंशिक प्रभाव रहेको छ। गण्डकी र कोशी जलाधारका पहाडी भूभागमा मेघगर्जन सहित वर्षाको सम्भावना रहेको छ।',
    daytimeEn: 'Partly to generally cloudy in the hilly regions of Koshi and Gandaki provinces; mainly fair in the rest of the provinces. Brief rain or thunder likely at isolated spots.',
    nighttimeEn: 'Generally fair in most parts of the country; partly cloudy in isolated mountain pockets with light ridge breezes.',
    specialAdvisory: 'Budhigandaki River at Arughat is currently at flood danger level. Downstream communities must maintain round-the-clock watch.',
    specialAdvisoryNp: 'बुढीगण्डकी नदीमा पानीको सतह खतराको तहमा रहेकाले तटीय क्षेत्रमा उच्च सतर्कता अपनाउनु हुन अनुरोध छ।',
    threeDayOutlook: dynamicThreeDayOutlook,
    radars: RADAR_FEEDS,
    ephemeris: EPHEMERIS_DATA,
  };

  return NextResponse.json({
    status: 'success',
    endpoint: '/api/bulletins',
    timestamp: now.toISOString(),
    bulletin: dynamicBulletin,
  }, {
    headers: {
      'Cache-Control': 'public, max-age=60, s-maxage=120',
    },
  });
}
