(async () => {
    const {importAll, getScript} = await import(`https://rpgen3.github.io/mylib/export/import.mjs`);
    await Promise.all([
        'https://code.jquery.com/jquery-3.3.1.min.js',
        'https://cdnjs.cloudflare.com/ajax/libs/encoding-japanese/1.0.29/encoding.min.js'
    ].map(getScript));
    const {$, MidiParser, Encoding} = window;
    const html = $('body').empty().css({
        'text-align': 'center',
        padding: '1em',
        'user-select': 'none'
    });
    const head = $('<header>').appendTo(html),
          main = $('<main>').appendTo(html),
          foot = $('<footer>').appendTo(html);
    $('<h1>').appendTo(head).text('ust2txt');
    $('<h2>').appendTo(head).text('USTファイルから歌詞を抜き出す');
    const rpgen3 = await importAll([
        'input',
        'css',
        'util'
    ].map(v => `https://rpgen3.github.io/mylib/export/${v}.mjs`));
    const rpgen4 = await importAll([
        [
            'UstEvent',
            'UstNote',
            'UstNoteMessage',
            'UstTempoMessage',
            'nsx39Scheduler'
        ].map(v => `https://rpgen3.github.io/nsx39/mjs/${v}.mjs`)
    ].flat());
    Promise.all([
        'container',
        'tab',
        'img',
        'btn'
    ].map(v => `https://rpgen3.github.io/spatialFilter/css/${v}.css`).map(rpgen3.addCSS));
    const hideTime = 500;
    const addHideArea = (label, parentNode = main) => {
        const html = $('<div>').addClass('container').appendTo(parentNode);
        const input = rpgen3.addInputBool(html, {
            label,
            save: true,
            value: true
        });
        const area = $('<dl>').appendTo(html);
        input.elm.on('change', () => input() ? area.show(hideTime) : area.hide(hideTime)).trigger('change');
        return Object.assign(input, {
            get html(){
                return area;
            }
        });
    };
    let g_ust = null;
    {
        const {html} = addHideArea('input UST file');
        $('<dt>').appendTo(html).text('USTファイル');
        $('<input>').appendTo($('<dd>').appendTo(html)).prop({
            type: 'file',
            accept: '.ust'
        }).on('change', async ({target}) => {
            const {files} = target;
            if(!files.length) return;
            const file = files[0];
            const a = new Uint8Array(await file.arrayBuffer());
            g_ust = Encoding.convert(a, {
                to: 'unicode',
                from: Encoding.detect(a),
                type: 'string'
            });
        });
        $('<dd>').appendTo(html);
        const isTrimmedUnset = rpgen3.addInputBool(html, {
            label: "未設定の歌詞を削除する",
            save: true,
            value: true
        });
        $('<dd>').appendTo(html);
        const isStartedNewline = rpgen3.addInputBool(html, {
            label: "改行する",
            save: true,
            value: true
        });
        const inputChunkSize = rpgen3.addSelect(html, {
            label: "歌詞の塊[小節]",
            save: true,
            list: [1, 2, 4, 8],
            value: 2,
        });
        const inputChunkShifted = rpgen3.addSelect(html, {
            label: "歌詞の塊の始まり[拍]",
            save: true,
            list: [1, 2, 3, 4],
            value: 4,
        });
        $('<dd>').appendTo(html);
        let outputElement = null;
        rpgen3.addBtn(html, '歌詞を出力', () => {
            if (outputElement) {
                $("dt").last().remove();
                $("dd").last().remove();
            }
            outputElement = rpgen3.addInputStr(html, {
                label: '歌詞',
                value: trimUnset(isTrimmedUnset(), ust2txt(
                        g_ust,
                        isStartedNewline(),
                        480 * 4 * inputChunkSize(),
                        480 * (inputChunkShifted() - 1)
                    )),
                textarea: true,
                copy: true
            });
        }).addClass('btn');
    }
    const ust2txt = (ust, isStartedNewline, chunkSize, chunkShifted) => {
        const ustEventArray = rpgen4.UstEvent.makeArray(ust);
        const ustNoteArray = rpgen4.UstNote.makeArray(ustEventArray);
        if (!isStartedNewline) return ustNoteArray.map(v => v.lyric).join('');
        let txt = "";
        let currentIndex = 0;
        for (const i of Array(Math.ceil(ustNoteArray.at(-1).end / chunkSize)).keys()) {
            const border = i * chunkSize + chunkShifted;
            while (currentIndex < ustNoteArray.length) {
                if (ustNoteArray[currentIndex].start < border) {
                    txt += ustNoteArray[currentIndex].lyric;
                    currentIndex++;
                } else {
                    break;
                }
            }
            txt += '\n';
        }
        return txt;
    };
    const trimUnset = (isTrimmedUnset, txt) => isTrimmedUnset ? txt.replace(/[あ|\n]+$/, '') : txt;
})();
