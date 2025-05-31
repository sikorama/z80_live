import { Meteor } from 'meteor/meteor';
import { SourceBuilds } from '../imports/api/sourceAsm.js';
import { getParam } from './settings.js';
import { Log } from 'meteor/logging';
import { args } from './utils.js';

const http = require('http');

// Nombre de clients connectés
let connexions_counter = 0;

export function init_assembler() {

    // When a client closes a session, clean all build information
    Meteor.onConnection(function (cnx) {
        connexions_counter += 1;
        Log.info('Connection '+ connexions_counter+ ' from client '+ cnx.id);

        cnx.onClose(function () {
            try {
                connexions_counter -= 1;

                Log.info('Client Connection closed '+ cnx.id);
                // Remove Curve Data
                SourceBuilds.remove({ sessionId: cnx.id });

            } catch (e) {
                Log.error(e);
            }
        });
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

                //sanitize sources
                source = source.normalize('NFD').replace(/[\u0300-\u036f]/g, "");
                //let json_to_send;
                let post_function = '/api/assemble';

                Log.info(args('Assemble settings:', settings));

                // Generates a filename
                if (!settings.filename) settings.filename = 'temp_' + buildId; 

                // Ensure there is an asm extension
                if (!settings.filename.endsWith('.asm'))
                    settings.filename += '.asm';

                let s0 = [];
                let s1 = '';

                settings.buildmode = settings.buildmode||'sna_cpc6128';
                settings.assembler = settings.assembler||'rasm';

                

                switch (settings.buildmode) {
                    case 'lib':
                        // Libe
                        post_function = '/api/store';
                        break;
                    // ----------  All this will be removed
                    /*case 'bin':
                        if (!settings.startPoint)
                            settings.startPoint = "#1000";
                        s0.push('ORG ' + settings.startPoint);
                        //source = source;
                        break;*/
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
                        let dskfilename= settings.filename.replace('.asm','.dsk');
                        s1 = s1 + "SAVE '-RUN.BIN'," + settings.startPoint + ',' + settings.endPoint + '-' + settings.startPoint + ',DSK,' + "'" + dskfilename+'\'\n';
                        break;
                    // default:
                    // Pas de break ici
                    case 'sna':

                    // to be removed
                        if (settings.assembler==='rasm') {                            
                            if (!settings.startPoint)
                            settings.startPoint = "#1000";
                            console.log('Add header - to be removed');
                            // TODO: move to build server
                            s0.push('BUILDSNA v2');
                            s0.push('BANKSET 0');
                            s0.push('ORG ' + settings.startPoint);
                            
                            if (!settings.entryPoint)
                            settings.entryPoint = settings.startPoint;
                            
                            if (settings.entryPoint != 'none')
                            s0.push('RUN $');
                            
                        }
                        //                        source = s0 + source;
 

                        break;
                    /*case 'zx80':
                        if (settings.assembler==='rasm') {
                            // ZX80 file
                        // HOBETA?
                        s0.push('BUILDZX');
                        s0.push('BANK 0');

                        if (!settings.entryPoint)
                            settings.entryPoint = settings.startPoint;

                        if (!settings.stackPointer)
                            settings.entryPointer = '$';

                        if (settings.entryPoint != 'none')
                            s0.push('RUN $,$');
                        }

                        break;*/
                }
                s0.push(' ');
                let hs = s0.join(' : ');



                Log.info('Header:'+ hs);
                Log.info(args('Assemble actual settings:', settings));

                source = hs + source + '\n' + s1;

                // Envoi d'un post au serveur de build
                let host_url = encodeURIComponent(getParam('buildServerURL'));
                let rport = getParam('buildServerPort');
      
                const json_to_send = JSON.stringify({ ...settings, ...{source:source}});
                
                console.log(json_to_send);
                // filename in URL is now deprecated
                let url = post_function + '/' + settings.filename; //+'?'+url_params.join('&');
                Log.info(args('Request:', url));
                
                let post_options = {
                    host: host_url,
                    port: rport,
                    method: 'POST',
                    path: url,
                    headers: {
                            'Content-Type': 'application/json',
                        //    'Content-Length': Buffer.byteLength(json_to_send)
                        //'Content-Type': 'text/html',
                        'Content-Length': json_to_send.length
                    }
                };

                 Log.info(args('Options:', post_options));
               

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
                            // Update DB
                            
                            ores.sessionId = sessionId;
                            ores.buildId = buildId;
                            ores.filename = settings.filename;
                            ores.origsource = settings.origsource;
                            ores.header = s0;
                            ores.footer = s1;
                            ores.duration = ores.duration;
                            Log.info('result=', ores);

                            SourceBuilds.insert(ores);
                        } catch (e) {
                            Log.error(e.stack);
                        }
                    }));
                }));

                if (post_req) {
                    post_req.on('error', function (errd) {
                        Log.error('POST Request Error:'+ errd);
                    });

                    post_req.write(json_to_send);
                    post_req.end();
                }

                return buildId; // Pour faire la recherche

            } catch (e) {
                Log.error(e);
                return 0;
            }
        },

    });
}
