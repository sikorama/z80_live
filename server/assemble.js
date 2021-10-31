import { Meteor } from 'meteor/meteor';
import { SourceBuilds } from '../imports/api/sourceAsm.js';
import { getParam } from './settings.js';

const http = require('http');

// Nombre de clients connectés
let connexions_counter = 0;

export function init_assembler() {

    // When a client closes a session, clean all build information
    Meteor.onConnection(function (cnx) {
        connexions_counter += 1;
        console.info('Connection', connexions_counter, 'from client', cnx.id);

        cnx.onClose(function () {
            try {
                connexions_counter -= 1;

                console.info('Client Connection closed', cnx.id);
                // Remove Curve Data
                SourceBuilds.remove({ sessionId: cnx.id });

            } catch (e) {
                console.error('Exception', e);
            }
        })
    });

    

    Meteor.methods({
        assemble: function (source, settings) {
            try {
                if (!settings) settings = {};

                // On vire ... on pourrait faire un upsert
                const sessionId = this.connection.id;
                const buildId = sessionId + '_' + Date.now();
                SourceBuilds.remove({
                    sessionId: sessionId,
                });

                // On vire les accents qui genent la compil
                // Ca provoque un message de réponse vide !?!
                source = source.normalize('NFD').replace(/[\u0300-\u036f]/g, "");
                // Ce qui est plus général que:
                //source = source.replace(/[éèê]/g, 'e');

                let post_function = '/build'

                console.info('Assemble settings:', settings);

                // SI on a pas précisé de nom, on utilise l'id de session comme nom de fichier
                if (!settings.filename) settings.filename = 'temp_' + buildId; // + '.asm';

                if (!settings.filename.endsWith('.asm'))
                    settings.filename += '.asm'

                let s0 = [];
                let s1 = '';

                //TODO: Mettre les ligne supplémentaires  sur une seule ligne
                // ---------- Remote?
                switch (settings.buildmode) {
                    case 'lib':
                        post_function = '/store';
                        break;
                    case 'raw':
                        break;
                    case 'bin':
                        if (!settings.startPoint)
                            settings.startPoint = "#1000";
                        s0.push('ORG ' + settings.startPoint);
                        //source = source;
                        break;
                    case 'dsk':

                        if (!settings.startPoint) {
                            s0.push('ORG #1000');
                            settings.startPoint = "_default_start";
                        }
                        else {
                            // s0 = 'ORG '+settings.startPoint+'\n';
                        }

                        if (!settings.endPoint)
                            settings.endPoint = '_default_end';

                        if (settings.entryPoint)
                            s0.push('RUN ' + settings.entryPoint);
                        s0.push('_default_start:');

                        s1 = '_default_end:\n';
                        s1 = s1 + "SAVE '-RUN.BIN'," + settings.startPoint + ',' + settings.endPoint + '-' + settings.startPoint + ',DSK,' + "'" + settings.filename + ".dsk' \n"
                        break;
                    default:
                        settings.buildmode = 'sna';

                    case 'sna':

                        if (!settings.startPoint)
                            settings.startPoint = "#1000";

                        remote_asm = true;
                        s0.push('BUILDSNA v2');
                        s0.push('BANKSET 0');
                        s0.push('ORG ' + settings.startPoint);

                        if (!settings.entryPoint)
                            settings.entryPoint = settings.startPoint;

                        if (settings.entryPoint != 'none')
                            s0.push('RUN $');

                        //                        source = s0 + source;
                        break;
                    case 'z80':
                        // ZX80 file
                        // HOBETA?
                        s0.push('BUILDZX');
                        s0.push('BANK 0');

                        //s0.push('HOBETA');
                        //s0.push('ORG ' + settings.startPoint);

                        if (!settings.entryPoint)
                            settings.entryPoint = settings.startPoint;

                        if (!settings.stackPointer)
                            settings.entryPointer = '$';

                        if (settings.entryPoint != 'none')
                            s0.push('RUN $,$');

                        break;
                }
                s0.push(' ');
                let hs = s0.join(' : ');
                console.info('Header:',  hs);
                source = hs + source + '\n' + s1;

                // Envoi d'un post au serveur de build
                let rurl = encodeURIComponent(getParam('buildServerURL'));
                let rport = getParam('buildServerPort');


                // En local
                let post_options = {
                    host: rurl,
                    port: rport,
                    method: 'POST',
                    path: post_function + '/' + settings.filename,
                    headers: {
                        'Content-Type': 'text/html',
                        'Content-Length': source.length
                    }
                };

                let resp = "";
                //
                const post_req = http.request(post_options, Meteor.bindEnvironment(function (res) {
                    res.setEncoding('utf8');
                    res.on('data', function (chunk) {
                        resp += chunk;
                    });

                    res.on('end', Meteor.bindEnvironment(function () {
                        try {
                            let ores = JSON.parse(resp);
                            // C'est la qu'on met a jour une DB avec le resultat et la date de build?

                            ores.sessionId = sessionId;
                            ores.buildId = buildId;
                            ores.filename = settings.filename;
                            ores.origsource = settings.origsource;
                            ores.header = s0;
                            ores.footer = s1;

                            SourceBuilds.insert(ores);
                        } catch (e) {
                            console.error(e.stack, resp);
                        }
                    }));
                }));

                if (post_req) {
                    post_req.on('error', function (errd) {
                        console.error('POST Request Error:', errd);
                    });

                    post_req.write(source);
                    post_req.end();
                }

                return buildId; // Pour faire la recherche

            } catch (e) {
                console.error('Assemble :', e);
                return 0;
            }
        },

    });
}
