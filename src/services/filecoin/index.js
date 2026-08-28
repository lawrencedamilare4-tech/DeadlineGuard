import * as synapseService from './synapseService';
import * as storageService from './storageService';
import * as paymentService from './paymentService';
import * as providerService from './providerService';
import * as retrievalService from './retrievalService';
import * as datasetService from './datasetService';
import * as verificationService from './verificationService';
import * as sessionService from './sessionService';

export const FilecoinService = {
  ...synapseService,
  ...storageService,
  ...paymentService,
  ...providerService,
  ...retrievalService,
  ...datasetService,
  ...verificationService,
  ...sessionService,
};