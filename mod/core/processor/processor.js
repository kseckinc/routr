/**
 * @author Pedro Sanders
 * @since v1
 */
const postal = require('postal')
const RequestProcessor = require('@routr/core/processor/request_processor')
const ResponseProcessor = require('@routr/core/processor/response_processor')
const SipListener = Java.type('javax.sip.SipListener')
const LogManager = Java.type('org.apache.logging.log4j.LogManager')
const LOG = LogManager.getLogger()

class Processor {

    constructor(sipProvider, registry, dataAPIs, contextStorage) {
        this.contextStorage = contextStorage
        this.requestProcessor = new RequestProcessor(sipProvider, dataAPIs, contextStorage)
        this.responseProcessor = new ResponseProcessor(sipProvider, dataAPIs, contextStorage, registry)
    }

    get listener () {
        const requestProcessor = this.requestProcessor
        const responseProcessor = this.responseProcessor

        return new SipListener({
            processRequest: function(event) {
                try {
                    requestProcessor.process(event)
                } catch(e) {
                    LOG.error(e)
                }
            },

            processResponse: function(event) {
                try {
                    responseProcessor.process(event)
                } catch(e) {
                    LOG.error(e)
                }
            },

            processTimeout: function(event) {
                const transactionId = event.isServerTransaction()?
                    event.getServerTransaction().getBranchId():
                        event.getClientTransaction().getBranchId()
                if (event.isServerTransaction()) {
                    postal.publish({
                      channel: "processor",
                      topic: "transaction.timeout",
                      data: {
                          transactionId: transactionId,
                          isServerTransaction: event.isServerTransaction()
                      }
                    })
                }
            },

            processTransactionTerminated: function(event) {
                if (event.isServerTransaction()) {
                    postal.publish({
                      channel: "processor",
                      topic: "transaction.terminated",
                      data: {
                          transactionId: event.getServerTransaction().getBranchId()
                      }
                    })
                }
            },

            processDialogTerminated: function(event) {
                postal.publish({
                  channel: "processor",
                  topic: "dialog.terminated",
                  data: {
                      dialogId: event.getDialog().getDialogId()
                  }
                })
            }
        })
    }
}

module.exports = Processor
