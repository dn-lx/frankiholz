"""Build the public house guide from the owner's photographed house rules.

Run with Python + ReportLab. The approved logo is cropped only, never redrawn.
The public PDF is the deployable artifact; no guest or booking data is included.
"""
from pathlib import Path
from html import escape
from PIL import Image
from reportlab.pdfgen import canvas
from reportlab.lib.colors import HexColor
from reportlab.lib.utils import ImageReader
from reportlab.platypus import Paragraph
from reportlab.lib.styles import ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'assets' / 'documents' / 'frankiholz-house-guide.pdf'
INK, GREEN, WOOD = map(HexColor, ['#0C3447', '#287D63', '#C48048'])
MUTED, LINE, PAPER = map(HexColor, ['#536B70', '#D9E5DF', '#F8F6F0'])
W, H = 595.276, 841.89
M = 48

fonts = Path('C:/Windows/Fonts')
pdfmetrics.registerFont(TTFont('Guide', str(fonts / 'segoeui.ttf')))
pdfmetrics.registerFont(TTFont('GuideBold', str(fonts / 'segoeuib.ttf')))
pdfmetrics.registerFontFamily('Guide', normal='Guide', bold='GuideBold', italic='Guide', boldItalic='GuideBold')
body = ParagraphStyle('body', fontName='Guide', fontSize=10.3, leading=15, textColor=INK)
small = ParagraphStyle('small', parent=body, fontSize=9, leading=13, textColor=MUTED)

logo = Image.open(ROOT / 'assets' / 'frankiholz-logo-for-dark.png').convert('RGBA')
logo = logo.crop(logo.getbbox())
logo.thumbnail((600, 600), Image.Resampling.LANCZOS)
lockup = ROOT / 'assets' / 'frankiholz-logo-lockup.png'
logo.save(lockup, optimize=True)
OUT.parent.mkdir(parents=True, exist_ok=True)
c = canvas.Canvas(str(OUT), pagesize=(W, H), pageCompression=1, invariant=1)
c.setTitle('Welcome to FrankiHolz | House guide & Hausregeln')
c.setAuthor('FrankiHolz')
c.setSubject('House guidelines in English and German')

def para(text, x, y, width=W-2*M, style=body):
    p = Paragraph(text, style)
    _, height = p.wrap(width, H)
    p.drawOn(c, x, y-height)
    return y-height

def header(lang, page, title, subtitle):
    c.setFillColor(PAPER); c.rect(0, 0, W, H, fill=1, stroke=0)
    c.setFillColor(INK); c.roundRect(M, H-117, 116, 79, 10, fill=1, stroke=0)
    c.drawImage(ImageReader(logo), M+13, H-109, width=90, height=61, preserveAspectRatio=True, anchor='c', mask='auto')
    c.setFillColor(GREEN); c.setFont('GuideBold', 9)
    c.drawRightString(W-M, H-58, lang)
    c.setFillColor(MUTED); c.setFont('Guide', 9)
    c.drawRightString(W-M, H-76, 'FRANKFURT-SACHSENHAUSEN')
    c.setFillColor(WOOD); c.rect(M, H-143, 30, 3, fill=1, stroke=0)
    c.setFillColor(INK); c.setFont('GuideBold', 29)
    c.drawString(M, H-182, title)
    y = para(subtitle, M, H-200, style=small)
    c.setStrokeColor(LINE); c.line(M, 61, W-M, 61)
    c.setFont('Guide', 8); c.setFillColor(MUTED)
    c.drawString(M, 43, 'FrankiHolz · Seehofstraße 20 · 60594 Frankfurt am Main')
    c.drawRightString(W-M, 43, f'{page:02d} / 04')
    return y-23

def section(num, title, items, y):
    c.setFillColor(GREEN); c.setFont('GuideBold', 9); c.drawString(M, y-11, num)
    c.setFillColor(INK); c.setFont('GuideBold', 13); c.drawString(M+29, y-12, title)
    y -= 25
    for item in items:
        c.setFillColor(WOOD); c.circle(M+33, y-7, 1.6, fill=1, stroke=0)
        y = para(escape(item), M+44, y, W-2*M-44)-6
    return y-13

def contact(y, de=False):
    c.setFillColor(HexColor('#E6EEE7')); c.roundRect(M, y-70, W-2*M, 70, 10, fill=1, stroke=0)
    c.setFillColor(INK); c.setFont('GuideBold', 11)
    c.drawString(M+16, y-22, 'Wir sind gerne für Sie da.' if de else 'We are here to help you feel at home.')
    para('WhatsApp: +49 176 62493 041 · info@frankiflow.de', M+16, y-32, W-2*M-32, small)
    c.linkURL('https://wa.me/4917662493041', (M, y-70, W-M, y), relative=0, thickness=0)

def glance(y, de=False):
    labels = [('CHECK-IN', 'ab 17:00' if de else 'from 17:00'), ('CHECK-OUT', 'bis 11:00' if de else 'by 11:00'), ('RUHEZEIT' if de else 'QUIET HOURS', '22:00 - 07:00')]
    width=(W-2*M-20)/3
    for i,(label,value) in enumerate(labels):
        x=M+i*(width+10)
        c.setFillColor(HexColor('#E6EEE7')); c.roundRect(x,y-62,width,62,8,fill=1,stroke=0)
        c.setFillColor(GREEN);c.setFont('GuideBold',8);c.drawString(x+12,y-20,label)
        c.setFillColor(INK);c.setFont('GuideBold',13);c.drawString(x+12,y-44,value)
    return y-83

y=header('ENGLISH',1,'Welcome to our home', 'A comfortable stay for everyone. Thank you for choosing FrankiHolz - we are happy to host you.')
y=glance(y)
y=section('01','Make yourself at home',[
    'After check-in, you may come and go at any time. Please keep noise low during quiet hours.',
    'You are welcome to bring your own food, prepare meals in the shared kitchen and enjoy the common areas respectfully.'
],y)
y=section('02','Your room & our shared home',[
    'Please leave all room and property items in the accommodation when you depart.',
    'Accidents can happen. Please tell us immediately if anything is damaged.',
    'Switch off lights, fans, air conditioning and electrical appliances when leaving your room.',
    'For safety and privacy, outside guests are not allowed in the rooms. Please speak with us first about exceptional circumstances.'
],y)
y=section('03','Kitchen & food',[
    'Breakfast and dinner are not included in your stay. Please use only food and drinks that you personally bring.',
    'Clean kitchen utensils and surfaces after use. Keep food in closed containers to avoid insects.'
],y)
contact(y)
c.showPage()
y=header('ENGLISH',2,'A little care goes a long way', 'Small courtesies keep our shared spaces welcoming for you, our neighbours and every guest.')
y=section('04','Bathroom & toilet',[
    'Please leave the bathroom and toilet clean after every use.',
    'We kindly ask everyone to use the toilet seated to help keep it clean and hygienic. Thank you for understanding.',
    'Never flush sanitary products, wipes or other non-flushable items. Use the bin provided.',
    'Keep the floor dry after showering and turn taps off properly.',
    'Please tell us immediately if you notice a plumbing problem.'
],y)
y=section('05','Quiet hours & safety',[
    'Keep noise to a minimum from 22:00 to 07:00 out of respect for others in the house and our neighbours.',
    'Smoking is not permitted inside the house or rooms. Smoke only in designated outdoor areas.',
    'Illegal substances are not allowed on the property. Candles and open flames are not permitted in the rooms.'
],y)
y=section('06','Departure & key return',[
    'Please check out by 11:00 on your departure date. Let us know before you leave so we can arrange the key return together.',
    'Leave your room in a respectful condition. We would love to hear your honest feedback and any suggestions for your next stay.'
],y)
contact(y)
c.showPage()
y=header('DEUTSCH',3,'Willkommen bei uns', 'Ein angenehmer Aufenthalt für alle. Schön, dass Sie sich für FrankiHolz entschieden haben - wir freuen uns auf Sie.')
y=glance(y,True)
y=section('01','Fühlen Sie sich wie zu Hause',[
    'Nach dem Check-in können Sie jederzeit kommen und gehen. Bitte beachten Sie dabei die Ruhezeiten.',
    'Bringen Sie gerne eigene Lebensmittel mit, bereiten Sie Mahlzeiten in der Gemeinschaftsküche zu und nutzen Sie die gemeinsamen Räume rücksichtsvoll.'
],y)
y=section('02','Ihr Zimmer & unser gemeinsames Zuhause',[
    'Bitte lassen Sie bei der Abreise alle Gegenstände aus dem Zimmer und der Unterkunft vor Ort.',
    'Missgeschicke können passieren. Informieren Sie uns bitte sofort, falls etwas beschädigt wird.',
    'Schalten Sie beim Verlassen des Zimmers Licht, Ventilatoren, Klimaanlage und elektrische Geräte aus.',
    'Aus Sicherheits- und Datenschutzgründen sind externe Besucher in den Zimmern nicht gestattet. Sprechen Sie bei Ausnahmen bitte vorher mit uns.'
],y)
y=section('03','Küche & Lebensmittel',[
    'Frühstück und Abendessen sind nicht im Aufenthalt enthalten. Bitte verwenden Sie nur selbst mitgebrachte Speisen und Getränke.',
    'Reinigen Sie Küchenutensilien und Oberflächen nach Gebrauch. Bewahren Sie Lebensmittel in geschlossenen Behältern auf, um Insekten zu vermeiden.'
],y)
contact(y,True)
c.showPage()
y=header('DEUTSCH',4,'Rücksicht macht den Unterschied', 'Mit kleinen Gesten bleiben die gemeinsamen Räume für Sie, unsere Nachbarn und alle Gäste angenehm.')
y=section('04','Badezimmer & Toilette',[
    'Bitte hinterlassen Sie Badezimmer und Toilette nach jeder Nutzung sauber.',
    'Wir bitten alle Gäste, die Toilette im Sitzen zu benutzen, damit sie sauber und hygienisch bleibt. Vielen Dank für Ihr Verständnis.',
    'Spülen Sie keine Hygieneartikel, Feuchttücher oder andere ungeeignete Gegenstände hinunter. Nutzen Sie den bereitgestellten Mülleimer.',
    'Halten Sie den Boden nach dem Duschen trocken und drehen Sie Wasserhähne richtig zu.',
    'Informieren Sie uns sofort, wenn Sie ein Problem mit den Leitungen oder Abflüssen bemerken.'
],y)
y=section('05','Ruhezeiten & Sicherheit',[
    'Bitte halten Sie den Geräuschpegel von 22:00 bis 07:00 aus Rücksicht auf die Hausbewohner und Nachbarn möglichst niedrig.',
    'Im Haus und in den Zimmern ist Rauchen nicht gestattet. Rauchen Sie nur in den vorgesehenen Außenbereichen.',
    'Illegale Substanzen sind auf dem Grundstück nicht erlaubt. Kerzen und offene Flammen sind in den Zimmern nicht gestattet.'
],y)
y=section('06','Abreise & Schlüsselrückgabe',[
    'Bitte reisen Sie am Abreisetag bis 11:00 Uhr ab. Geben Sie uns vor der Abreise Bescheid, damit wir die Schlüsselrückgabe gemeinsam abstimmen können.',
    'Hinterlassen Sie Ihr Zimmer bitte in einem ordentlichen Zustand. Wir freuen uns über ehrliche Rückmeldungen und Anregungen für Ihren nächsten Aufenthalt.'
],y)
contact(y,True)
c.save()
print(OUT)
